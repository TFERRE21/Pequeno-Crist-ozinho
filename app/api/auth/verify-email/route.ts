import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { query, transaction } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(request:Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token || token.length > 200) return NextResponse.json({error:"Link de verificação inválido."},{status:400});
  const hash = createHash("sha256").update(token).digest("hex");
  try {
    const result = await transaction(async client => {
      const found = await client.query<{id:string;user_id:string}>("SELECT id,user_id FROM pc_email_tokens WHERE token_hash=$1 AND purpose='verify_email' AND used_at IS NULL AND expires_at>now() FOR UPDATE",[hash]);
      const row = found.rows[0]; if (!row) return false;
      await client.query("UPDATE pc_email_tokens SET used_at=now() WHERE id=$1",[row.id]);
      await client.query("UPDATE pc_users SET status='active',email_verified_at=COALESCE(email_verified_at,now()),updated_at=now() WHERE id=$1",[row.user_id]);
      return true;
    });
    const site=(process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin).replace(/\/$/,"");
    return NextResponse.redirect(site+(result?"/minha-conta?email=verificado":"/entrar?email=link-invalido"));
  } catch { return NextResponse.json({error:"Não foi possível validar o e-mail. Tente novamente."},{status:503}); }
}
