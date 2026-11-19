import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/signup"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!userId && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (userId && isPublic) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

// Les routes /api vérifient elles-mêmes la session (réponse 401 plutôt que redirection,
// indispensable pour les actions de notification exécutées par le service worker).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|manifest.webmanifest|sw.js|favicon.ico).*)"],
};
