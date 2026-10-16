import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
export const runtime="nodejs";
export async function GET() {
  try {
    const user=await currentUser(); if(!user)return NextResponse.json({error:"Faça login para consultar seus pedidos."},{status:401});
    const result=await query("SELECT o.id,o.order_number,o.total_cents,o.currency,o.status,o.payment_status,o.created_at,o.paid_at,COALESCE(json_agg(json_build_object('productId',i.product_id,'name',i.product_name,'unitPriceCents',i.unit_price_cents,'quantity',i.quantity,'subtotalCents',i.subtotal_cents)) FILTER (WHERE i.id IS NOT NULL),'[]'::json) AS items FROM pc_orders o LEFT JOIN pc_order_items i ON i.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100",[user.id]);
    return NextResponse.json({orders:result.rows});
  } catch(error) { console.error("Falha ao carregar pedidos:",error instanceof Error?error.message:"erro desconhecido"); return NextResponse.json({error:"Não foi possível carregar os pedidos."},{status:503}); }
}
