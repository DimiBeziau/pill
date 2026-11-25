-- CreateTable
CREATE TABLE "PausePeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    CONSTRAINT "PausePeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PausePeriod_userId_endDate_idx" ON "PausePeriod"("userId", "endDate");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pausedUntil";
