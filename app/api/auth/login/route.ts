import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request:Request) {
 try {
  const body=await request.json();const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";const password=typeof body.password==="string"?body.password:"";
  if(!email||!password||email.length>254||password.length>128)return NextResponse.json({error:"Informe e-mail e senha."},{status:400});
  const ip=(request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"unknown").split(",")[0].trim();
  const ipKey=createHash("sha256").update(ip+(process.env.AUTH_RATE_LIMIT_SALT||process.env.AUTH_SECRET||"")).digest("hex");
  const attempts=await query<{count:string}>("SELECT count(*)::text AS count FROM pc_auth_attempts WHERE attempted_at>now()-interval '15 minutes' AND succeeded=false AND (email_key=$1 OR ip_key=$2)",[createHash("sha256").update(email).digest("hex"),ipKey]);
  if(Number(attempts.rows[0]?.count||0)>=10)return NextResponse.json({error:"Muitas tentativas. Aguarde 15 minutos antes de tentar novamente."},{status:429});
  const result=await query<{id:string;email:string;full_name:string;password_hash:string;role:"customer"|"admin";status:string}>("SELECT id,email,full_name,password_hash,role,status FROM pc_users WHERE lower(email)=$1 LIMIT 1",[email]);
  const user=result.rows[0];const passwordOk=user?await bcrypt.compare(password,user.password_hash):await bcrypt.compare(password,"$2a$12$C6UzMDM.H6dfI/f/IKcEe.3K8sW5qWJ7g7N8HqV7f7X0H9q8K7YqK");
  const succeeded=!!user&&passwordOk&&user.status==="active";
  await query("INSERT INTO pc_auth_attempts(email_key,ip_key,succeeded) VALUES($1,$2,$3)",[createHash("sha256").update(email).digest("hex"),ipKey,succeeded]);
  if(!user||!passwordOk)return NextResponse.json({error:"E-mail ou senha incorretos."},{status:401});
  if(user.status!=="active")return NextResponse.json({error:"Confirme seu e-mail antes de entrar."},{status:403});
  await query("UPDATE pc_users SET last_login_at=now(),updated_at=now() WHERE id=$1",[user.id]);
  await createSession({id:user.id,email:user.email,fullName:user.full_name,role:user.role});
  return NextResponse.json({ok:true,user:{id:user.id,email:user.email,fullName:user.full_name,role:user.role}});
 } catch(error) {console.error("Falha no login:",error instanceof Error?error.message:"erro desconhecido");return NextResponse.json({error:"Não foi possível entrar. Confira a configuração do servidor."},{status:503});}
}
