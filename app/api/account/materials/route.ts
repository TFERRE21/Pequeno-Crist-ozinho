import {NextResponse} from "next/server";
import {currentUser} from "@/lib/auth";
import {query} from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
 try{const user=await currentUser();if(!user)return NextResponse.json({error:"Faça login."},{status:401});
 const r=await query("SELECT d.id AS delivery_id,d.product_id,d.status,d.released_at,o.order_number,o.created_at AS purchase_date,i.product_name,i.quantity FROM pc_deliveries d JOIN pc_orders o ON o.id=d.order_id JOIN pc_order_items i ON i.id=d.order_item_id WHERE o.user_id=$1 AND o.payment_status='paid' AND d.status='available' ORDER BY d.released_at DESC",[user.id]);
 return NextResponse.json({materials:r.rows});}catch{return NextResponse.json({error:"Não foi possível carregar seus materiais."},{status:503});}
}
