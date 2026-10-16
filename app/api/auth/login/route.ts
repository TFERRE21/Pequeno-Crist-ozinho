import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request:Request) {
  try {
    const body=await request.json();
    const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
    const password=typeof body.password==="string"?body.password:"";
    if(!email||!password||email.length>254||password.length>128) return NextResponse.json({error:"Informe e-mail e senha."},{status:400});
    const result=await query<{id:string;email:string;full_name:string;password_hash:string;role:"customer"|"admin";status:string}>("SELECT id,email,full_name,password_hash,role,status FROM pc_users WHERE lower(email)=$1 LIMIT 1",[email]);
    const user=result.rows[0];
    if(!user||!(await bcrypt.compare(password,user.password_hash))) return NextResponse.json({error:"E-mail ou senha incorretos."},{status:401});
    if(user.status!=="active") return NextResponse.json({error:"Confirme seu e-mail antes de entrar."},{status:403});
    await query("UPDATE pc_users SET last_login_at=now(),updated_at=now() WHERE id=$1",[user.id]);
    await createSession({id:user.id,email:user.email,fullName:user.full_name,role:user.role});
    return NextResponse.json({ok:true,user:{id:user.id,email:user.email,fullName:user.full_name,role:user.role}});
  } catch(error) {
    console.error("Falha no login:",error instanceof Error?error.message:"erro desconhecido");
    return NextResponse.json({error:"Não foi possível entrar. Confira a configuração do servidor."},{status:503});
  }
}
