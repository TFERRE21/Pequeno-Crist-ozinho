import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
export const runtime="nodejs";
type Context={params:Promise<{ticketId:string}>};
export async function GET(_request:Request,context:Context) {
 try {
  const user=await currentUser();if(!user)return NextResponse.json({error:"Autenticação necessária."},{status:401});if(user.role!=="admin")return NextResponse.json({error:"Acesso negado."},{status:403});
  const {ticketId}=await context.params;
  const [ticket,messages]=await Promise.all([query("SELECT t.*,u.full_name,u.email FROM pc_support_tickets t JOIN pc_users u ON u.id=t.user_id WHERE t.id=$1",[ticketId]),query("SELECT id,author_type,author_user_id,content,is_read,created_at FROM pc_support_messages WHERE ticket_id=$1 ORDER BY created_at",[ticketId])]);
  if(!ticket.rows[0])return NextResponse.json({error:"Chamado não encontrado."},{status:404});
  return NextResponse.json({ticket:ticket.rows[0],messages:messages.rows});
 }catch{return NextResponse.json({error:"Não foi possível carregar o chamado."},{status:503});}
}
export async function POST(request:Request,context:Context) {
 try {
  const user=await currentUser();if(!user)return NextResponse.json({error:"Autenticação necessária."},{status:401});if(user.role!=="admin")return NextResponse.json({error:"Acesso negado."},{status:403});
  const {ticketId}=await context.params;const body=await request.json();const content=typeof body.content==="string"?body.content.trim():"";
  if(content.length<1||content.length>10000)return NextResponse.json({error:"Mensagem inválida."},{status:400});
  const result=await transaction(async client=>{
   const ticket=await client.query("SELECT id FROM pc_support_tickets WHERE id=$1 FOR UPDATE",[ticketId]);if(!ticket.rows[0])return null;
   const m=await client.query("INSERT INTO pc_support_messages(ticket_id,author_user_id,author_type,content) VALUES($1,$2,'admin',$3) RETURNING id,author_type,content,created_at",[ticketId,user.id,content]);
   await client.query("UPDATE pc_support_tickets SET status='answered',updated_at=now() WHERE id=$1",[ticketId]);
   return m.rows[0];
  });
  if(!result)return NextResponse.json({error:"Chamado não encontrado."},{status:404});
  return NextResponse.json({message:result},{status:201});
 }catch{return NextResponse.json({error:"Não foi possível responder ao chamado."},{status:503});}
}
