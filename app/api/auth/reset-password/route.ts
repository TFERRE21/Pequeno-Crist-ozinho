import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { transaction } from "@/lib/db";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const body=await request.json();const token=typeof body.token==="string"?body.token:"";const password=typeof body.password==="string"?body.password:"";
  if(token.length<20||token.length>200||password.length<10||password.length>128)return NextResponse.json({error:"Link inválido ou senha fora do tamanho permitido."},{status:400});
  const hash=createHash("sha256").update(token).digest("hex"),passwordHash=await bcrypt.hash(password,12);
  const done=await transaction(async client=>{
   const r=await client.query("SELECT id,user_id FROM pc_email_tokens WHERE token_hash=$1 AND purpose='password_reset' AND used_at IS NULL AND expires_at>now() FOR UPDATE",[hash]);const row=r.rows[0];if(!row)return false;
   await client.query("UPDATE pc_email_tokens SET used_at=now() WHERE id=$1",[row.id]);
   await client.query("UPDATE pc_users SET password_hash=$2,updated_at=now() WHERE id=$1",[row.user_id,passwordHash]);
   await client.query("INSERT INTO pc_audit_log(actor_user_id,action,entity_type,entity_id) VALUES($1,'password_reset','user',$2)",[row.user_id,row.user_id]);
   return true;
  });
  if(!done)return NextResponse.json({error:"Link expirado ou já utilizado. Solicite uma nova recuperação."},{status:400});
  return NextResponse.json({ok:true,message:"Senha alterada. Você já pode entrar com a nova senha."});
 }catch(error){console.error("Falha ao redefinir senha:",error instanceof Error?error.message:"erro desconhecido");return NextResponse.json({error:"Não foi possível alterar a senha."},{status:503});}
}
