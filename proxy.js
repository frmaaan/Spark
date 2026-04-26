import { NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

// Daftar route yang TIDAK perlu login
const publicRoutes = ["/login", "/register"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Lewati pengecekan untuk file statis, API, dan Next.js internal
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  // Cek apakah route saat ini adalah route publik
  const isPublicRoute = publicRoutes.includes(pathname);

  // Ambil token dari cookie
  const token = request.cookies.get("auth_token")?.value;
  const session = token ? await decrypt(token) : null;

  // Jika belum login & mengakses halaman yang diproteksi
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login & mencoba mengakses halaman login/register
  if (session && isPublicRoute) {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Terapkan proxy ke semua route
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
