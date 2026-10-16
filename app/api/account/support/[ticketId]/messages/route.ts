import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
export const runtime="nodejs";
type Context={params:Promise<{ticketId:string}>};
export async function GET(_request:Request,context:Context) {
 try {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Faça login."},{status:401});
  const {ticketId}=await context.params;
  const ticket=await query("SELECT id,ticket_number,subject,category,status,priority,created_at,updated_at FROM pc_support_tickets WHERE id=$1 AND user_id=$2",[ticketId,user.id]);
  if(!ticket.rows[0])return NextResponse.json({error:"Chamado não encontrado."},{status:404});
  const messages=await query("SELECT id,author_type,content,is_read,created_at FROM pc_support_messages WHERE ticket_id=$1 ORDER BY created_at ASC",[ticketId]);
  await query("UPDATE pc_support_messages SET is_read=true WHERE ticket_id=$1 AND author_type IN ('assistant','admin','system')",[ticketId]);
  return NextResponse.json({ticket:ticket.rows[0],messages:messages.rows});
 } catch { return NextResponse.json({error:"Não foi possível carregar a conversa."},{status:503}); }
}
export async function POST(request:Request,context:Context) {
 try {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Faça login."},{status:401});
  const {ticketId}=await context.params; const body=await request.json(); const content=typeof body.content==="string"?body.content.trim():"";
  if(content.length<1||content.length>10000)return NextResponse.json({error:"Mensagem inválida."},{status:400});
  const result=await transaction(async client=>{
   const t=await client.query("SELECT id,status FROM pc_support_tickets WHERE id=$1 AND user_id=$2 FOR UPDATE",[ticketId,user.id]);
   if(!t.rows[0])return {error:"NOT_FOUND" as const};
   if(t.rows[0].status==="closed")return {error:"CLOSED" as const};
   const m=await client.query("INSERT INTO pc_support_messages(ticket_id,author_user_id,author_type,content) VALUES($1,$2,'customer',$3) RETURNING id,author_type,content,is_read,created_at",[ticketId,user.id,content]);
   await client.query("UPDATE pc_support_tickets SET status='open',updated_at=now() WHERE id=$1",[ticketId]);
   return {message:m.rows[0]};
  });
  if("error" in result)return NextResponse.json({error:result.error==="NOT_FOUND"?"Chamado não encontrado.":"Este chamado está encerrado."},{status:result.error==="NOT_FOUND"?404:409});
  return NextResponse.json(result,{status:201});
 } catch { return NextResponse.json({error:"Não foi possível enviar a mensagem."},{status:503}); }
}
