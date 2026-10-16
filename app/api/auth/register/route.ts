import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const runtime = "nodejs";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/[^\d+]/g, "").slice(0, 20) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const acceptedTerms = body.acceptedTerms === true;
    if (fullName.length < 2 || fullName.length > 160 || !emailPattern.test(email) || email.length > 254 || password.length < 10 || password.length > 128 || !acceptedTerms) {
      return NextResponse.json({ error: "Informe nome, e-mail válido, senha de pelo menos 10 caracteres e aceite os termos." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await query<{id:string;full_name:string;email:string}>(
      "INSERT INTO pc_users(full_name,email,whatsapp,password_hash,status) VALUES($1,$2,$3,$4,'pending_verification') ON CONFLICT DO NOTHING RETURNING id,full_name,email",
      [fullName,email,whatsapp,passwordHash]
    );
    const user = created.rows[0];
    if (!user) return NextResponse.json({ error: "Não foi possível cadastrar este e-mail. Se já tiver conta, entre ou recupere sua senha." }, { status: 409 });
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await query("INSERT INTO pc_email_tokens(user_id,token_hash,purpose,expires_at) VALUES($1,$2,'verify_email',now()+interval '24 hours')", [user.id,tokenHash]);
    const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/,"");
    const link = site + "/api/auth/verify-email?token=" + encodeURIComponent(rawToken);
    const apiKey = process.env.RESEND_API_KEY, from = process.env.DELIVERY_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error("Cadastro criado, mas e-mail de verificação não configurado.");
      return NextResponse.json({ ok: true, message: "Cadastro recebido, mas o envio de verificação ainda precisa ser configurado. Entre em contato com o suporte." }, { status: 201 });
    }
    const sent = await fetch("https://api.resend.com/emails", { method:"POST", headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"}, body:JSON.stringify({from,to:[email],subject:"Confirme seu e-mail — Pequeno Cristãozinho",html:`<p>Olá, ${escapeHtml(fullName)}!</p><p>Confirme seu endereço de e-mail para ativar sua conta.</p><p><a href="${link}">Confirmar meu e-mail</a></p><p>Este link expira em 24 horas.</p>`,text:"Confirme seu e-mail em até 24 horas: "+link}) });
    if (!sent.ok) {
      console.error("Falha ao enviar verificação por e-mail:",sent.status);
      return NextResponse.json({ ok:true, message:"Cadastro recebido, mas não foi possível enviar o e-mail de verificação. Solicite novo envio ao suporte." }, { status:201 });
    }
    return NextResponse.json({ ok:true, message:"Cadastro criado. Confira seu e-mail para confirmar a conta." }, { status:201 });
  } catch (error) {
    console.error("Falha no cadastro:",error instanceof Error?error.message:"erro desconhecido");
    return NextResponse.json({ error:"Não foi possível concluir o cadastro. Confira se o banco está configurado." }, { status:503 });
  }
}
function escapeHtml(value:string) { return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] || c)); }
