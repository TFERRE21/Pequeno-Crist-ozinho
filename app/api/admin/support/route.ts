import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export const runtime="nodejs";
export async function GET(request:Request) {
 try {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Autenticação necessária."},{status:401}); if(user.role!=="admin")return NextResponse.json({error:"Acesso negado."},{status:403});
  const params=new URL(request.url).searchParams; const status=params.get("status"); const q=params.get("q")?.trim().slice(0,100)||"";
  const result=await query("SELECT t.id,t.ticket_number,t.subject,t.category,t.status,t.priority,t.created_at,t.updated_at,u.full_name,u.email FROM pc_support_tickets t JOIN pc_users u ON u.id=t.user_id WHERE ($1::text IS NULL OR t.status=$1) AND ($2='' OR t.ticket_number ILIKE '%'||$2||'%' OR t.subject ILIKE '%'||$2||'%' OR u.email ILIKE '%'||$2||'%') ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,t.updated_at DESC LIMIT 200",[status,q]);
  return NextResponse.json({tickets:result.rows});
 } catch { return NextResponse.json({error:"Não foi possível consultar os chamados."},{status:503}); }
}
export async function PATCH(request:Request) {
 try {
  const user=await currentUser(); if(!user)return NextResponse.json({error:"Autenticação necessária."},{status:401}); if(user.role!=="admin")return NextResponse.json({error:"Acesso negado."},{status:403});
  const body=await request.json(); const id=typeof body.id==="string"?body.id:""; const status=body.status; const priority=body.priority;
  if(!id||!(["open","waiting_customer","waiting_human","answered","closed"].includes(status)||["low","normal","high","urgent"].includes(priority)))return NextResponse.json({error:"Atualização inválida."},{status:400});
  const result=await query("UPDATE pc_support_tickets SET status=COALESCE($2,status),priority=COALESCE($3,priority),updated_at=now() WHERE id=$1 RETURNING id,ticket_number,status,priority",[id,["open","waiting_customer","waiting_human","answered","closed"].includes(status)?status:null,["low","normal","high","urgent"].includes(priority)?priority:null]);
  if(!result.rows[0])return NextResponse.json({error:"Chamado não encontrado."},{status:404});
  return NextResponse.json({ticket:result.rows[0]});
 } catch { return NextResponse.json({error:"Não foi possível atualizar o chamado."},{status:503}); }
}
