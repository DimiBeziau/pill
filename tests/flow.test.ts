import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendToUser = vi.fn();
vi.mock("@/lib/push", () => ({ isPushConfigured: () => true, sendToUser: (...a: unknown[]) => sendToUser(...a) }));

const dir = mkdtempSync(join(tmpdir(), "pill-test-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;

type Db = typeof import("@/lib/db");
type Intake = typeof import("@/lib/intake");
type Sched = typeof import("@/lib/scheduler");
type Pause = typeof import("@/lib/pause");
let prisma: Db["prisma"];
let intake: Intake;
let sched: Sched;
let pause: Pause;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", { env: process.env, stdio: "ignore" });
  ({ prisma } = await import("@/lib/db"));
  intake = await import("@/lib/intake");
  sched = await import("@/lib/scheduler");
  pause = await import("@/lib/pause");
});
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

// 2026-11-19, Europe/Paris (UTC+1) : rappel à 21:00 locale = 20:00Z
const at = (hhmm: string) => new Date(`2026-11-19T${hhmm}:00Z`);

async function makeUser() {
  await prisma.user.deleteMany();
  const u = await prisma.user.create({
    data: {
      email: "a@b.fr", name: "A", passwordHash: "x",
      reminderTime: "21:00", timezone: "Europe/Paris", snoozeMinutes: 60, repeatMinutes: 30,
      createdAt: new Date("2026-11-01T00:00:00Z"),
      subscriptions: { create: { endpoint: "https://push.example/1", p256dh: "k", auth: "a" } },
    },
  });
  return u;
}

describe("rappels", () => {
  beforeEach(() => sendToUser.mockReset().mockResolvedValue(1));

  it("n'envoie rien avant l'heure, puis notifie, puis relance", async () => {
    await makeUser();
    expect(await sched.tick(at("19:59"))).toBe(0);
    expect(await sched.tick(at("20:00"))).toBe(1);
    expect(await sched.tick(at("20:10"))).toBe(0); // relance dans 30 min
    expect(await sched.tick(at("20:30"))).toBe(1);
    expect(sendToUser).toHaveBeenCalledTimes(2);
  });

  it("s'arrête une fois la pilule prise", async () => {
    const u = await makeUser();
    await sched.tick(at("20:00"));
    await intake.markTaken(u, undefined, at("20:05"));
    expect(await sched.tick(at("20:30"))).toBe(0);
    const row = await prisma.intake.findFirstOrThrow({ where: { userId: u.id } });
    expect(row.status).toBe("TAKEN");
    expect(row.takenAt?.toISOString()).toBe(at("20:05").toISOString());
  });

  it("reporte le rappel du délai choisi", async () => {
    const u = await makeUser();
    await sched.tick(at("20:00"));
    const next = await intake.snooze(u, at("20:01"));
    expect(next?.toISOString()).toBe(at("21:01").toISOString());
    expect(await sched.tick(at("20:45"))).toBe(0);
    expect(await sched.tick(at("21:01"))).toBe(1);
  });

  it("plafonne les relances et réessaie si aucun appareil joignable", async () => {
    await makeUser();
    sendToUser.mockResolvedValue(0);
    expect(await sched.tick(at("20:00"))).toBe(0);
    expect(await sched.tick(at("20:04"))).toBe(0); // pas avant 5 min
    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(await sched.tick(at("20:05"))).toBe(0);
    expect(sendToUser).toHaveBeenCalledTimes(2);
  });

  it("la pause de fin de plaquette coupe les notifications 7 jours, puis reprend", async () => {
    const u = await makeUser();
    const range = await pause.startPause(u, at("10:00"));
    expect(range).toEqual({ startDate: "2026-11-19", endDate: "2026-11-26" });
    expect(await sched.tick(at("20:00"))).toBe(0);
    expect(await prisma.intake.count({ where: { userId: u.id } })).toBe(0);
    expect(await sched.tick(new Date("2026-11-25T20:00:00Z"))).toBe(0);
    expect(await sched.tick(new Date("2026-11-26T20:00:00Z"))).toBe(1);
  });

  it("reprendre tôt raccourcit la pause (ou la supprime le jour même)", async () => {
    const u = await makeUser();
    await pause.startPause(u, at("10:00"));
    await pause.endPause(u, at("10:30"));
    expect(await prisma.pausePeriod.count({ where: { userId: u.id } })).toBe(0);
    expect(await sched.tick(at("20:00"))).toBe(1);

    await pause.startPause(u, new Date("2026-11-20T10:00:00Z"));
    await pause.endPause(u, new Date("2026-11-22T10:00:00Z"));
    const p = await prisma.pausePeriod.findFirstOrThrow({ where: { userId: u.id } });
    expect(p.endDate).toBe("2026-11-22");
  });

  it("changer l'heure réaligne le rappel du jour", async () => {
    const u = await makeUser();
    await intake.ensureIntake(u, "2026-11-19");
    const updated = await prisma.user.update({ where: { id: u.id }, data: { reminderTime: "22:30" } });
    await intake.rescheduleToday(updated, at("10:00"));
    const row = await prisma.intake.findFirstOrThrow({ where: { userId: u.id } });
    expect(row.nextReminderAt?.toISOString()).toBe(at("21:30").toISOString());
  });
});

describe("prises", () => {
  it("régularise un oubli passé, refuse le futur, et annuler le rend oublié", async () => {
    const u = await makeUser();
    expect((await intake.markTaken(u, "2026-11-17", at("10:00"))).ok).toBe(true);
    expect((await intake.markTaken(u, "2026-11-25", at("10:00"))).ok).toBe(false);
    expect((await intake.undoTaken(u, "2026-11-17", at("10:00"))).ok).toBe(true);
    expect(await prisma.intake.count({ where: { userId: u.id, date: "2026-11-17" } })).toBe(0);
  });
});
