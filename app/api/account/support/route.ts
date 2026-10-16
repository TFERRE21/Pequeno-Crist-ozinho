import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { transaction, query } from "@/lib/db";
export const runtime="nodejs";
const categories=new Set(["produtos","pagamento","pedido","material","download","impressao","conta","reembolso","outros"]);
export async function GET() {
 try {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Faça login para consultar seus chamados."},{status:401});
  const r=await query("SELECT t.id,t.ticket_number,t.subject,t.category,t.status,t.priority,t.created_at,t.updated_at,(SELECT count(*)::int FROM pc_support_messages m WHERE m.ticket_id=t.id AND m.is_read=false AND m.author_type<>'customer') AS unread_count FROM pc_support_tickets t WHERE t.user_id=$1 ORDER BY t.updated_at DESC LIMIT 100",[user.id]);
  return NextResponse.json({tickets:r.rows});
 } catch { return NextResponse.json({error:"Não foi possível carregar os chamados."},{status:503}); }
}
export async function POST(request:Request) {
 try {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Faça login para abrir um chamado."},{status:401});
  const body=await request.json(); const subject=typeof body.subject==="string"?body.subject.trim():""; const message=typeof body.message==="string"?body.message.trim():""; const category=typeof body.category==="string"&&categories.has(body.category)?body.category:"outros";
  if(subject.length<3||subject.length>180||message.length<1||message.length>10000)return NextResponse.json({error:"Informe um assunto e uma mensagem (até 10.000 caracteres). "},{status:400});
  const ticket=await transaction(async client=>{
   const number="PC-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+randomInt(100000,999999);
   const t=await client.query("INSERT INTO pc_support_tickets(ticket_number,user_id,subject,category,initial_message,status) VALUES($1,$2,$3,$4,$5,'open') RETURNING id,ticket_number,subject,category,status,priority,created_at,updated_at",[number,user.id,subject,category,message]);
   await client.query("INSERT INTO pc_support_messages(ticket_id,author_user_id,author_type,content) VALUES($1,$2,'customer',$3)",[t.rows[0].id,user.id,message]);
   return t.rows[0];
  });
  return NextResponse.json({ticket}, {status:201});
 } catch(error) { console.error("Falha ao abrir chamado:",error instanceof Error?error.message:"erro desconhecido"); return NextResponse.json({error:"Não foi possível abrir o chamado."},{status:503}); }
}
