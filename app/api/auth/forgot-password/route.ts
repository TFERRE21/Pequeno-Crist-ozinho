import { NextResponse } from "next/server";
import { randomBytes,createHash } from "node:crypto";
import { query } from "@/lib/db";
export const runtime="nodejs";
export async function POST(request:Request){
 const generic={ok:true,message:"Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação."};
 try{
  const body=await request.json();const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return NextResponse.json(generic);
  const r=await query<{id:string;full_name:string}>("SELECT id,full_name FROM pc_users WHERE lower(email)=$1 AND status='active' LIMIT 1",[email]);const user=r.rows[0];if(!user)return NextResponse.json(generic);
  const raw=randomBytes(32).toString("base64url"),hash=createHash("sha256").update(raw).digest("hex");
  await query("INSERT INTO pc_email_tokens(user_id,token_hash,purpose,expires_at) VALUES($1,$2,'password_reset',now()+interval '30 minutes')",[user.id,hash]);
  const apiKey=process.env.RESEND_API_KEY,from=process.env.DELIVERY_FROM_EMAIL;if(!apiKey||!from){console.error("Recuperação de senha sem configuração de e-mail.");return NextResponse.json(generic);}
  const site=(process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin).replace(/\/$/,""),link=site+"/redefinir-senha?token="+encodeURIComponent(raw);
  const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject:"Recuperação de senha — Pequeno Cristãozinho",html:"<p>Recebemos uma solicitação para redefinir a senha da sua conta.</p><p><a href=\""+link+"\">Criar nova senha</a></p><p>O link expira em 30 minutos. Se não solicitou, ignore esta mensagem.</p>",text:"Redefina sua senha em até 30 minutos: "+link})});
  if(!sent.ok)console.error("Falha ao enviar recuperação de senha:",sent.status);
  return NextResponse.json(generic);
 }catch(error){console.error("Falha em recuperação de senha:",error instanceof Error?error.message:"erro desconhecido");return NextResponse.json(generic);}
}
