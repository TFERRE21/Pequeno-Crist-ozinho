import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

const COOKIE_NAME = "pc_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
function secretKey() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET deve ter pelo menos 32 caracteres.");
  return new TextEncoder().encode(value);
}
export type SessionUser = { id: string; email: string; fullName: string; role: "customer" | "admin" };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ email: user.email, fullName: user.fullName, role: user.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`).sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}
export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = typeof payload.sub === "string" ? payload.sub : "";
    if (!id) return null;
    const result = await query<{ id: string; email: string; full_name: string; role: "customer" | "admin"; status: string }>(
      "SELECT id,email,full_name,role,status FROM pc_users WHERE id=$1", [id]
    );
    const row = result.rows[0];
    if (!row || row.status !== "active") return null;
    return { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
  } catch { return null; }
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
