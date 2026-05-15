import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Wajib gunakan secret dari environment di production.
const secretKey = process.env.SESSION_SECRET || "dev-only-insecure-session-secret";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production");
}

const key = new TextEncoder().encode(secretKey);

// =============================================================
// 1. ENCRYPT & DECRYPT JWT
// =============================================================
export async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // Sesi berlaku 24 jam
    .sign(key);
}

export async function decrypt(input) {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

// =============================================================
// 2. GET SESSION
// =============================================================
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return await decrypt(token);
}
