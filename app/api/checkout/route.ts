import { NextResponse } from "next/server";
import Stripe from "stripe";
import { randomBytes } from "node:crypto";
import { products } from "@/lib/products";
import { currentUser } from "@/lib/auth";
import { transaction, query } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request: Request) {
 let orderId:string|undefined;
 try {
  if(!process.env.STRIPE_SECRET_KEY)return NextResponse.json({error:"Pagamento ainda não configurado: falta STRIPE_SECRET_KEY no servidor."},{status:503});
  const body=await request.json();const items=body?.items;
  if(!Array.isArray(items)||items.length===0||items.length>30)return NextResponse.json({error:"Carrinho inválido."},{status:400});
  const user=await currentUser();
  const line_items:Stripe.Checkout.SessionCreateParams.LineItem[]=[];
  const selected:{id:string;name:string;price:number;quantity:number;stripePriceId:string}[]=[];
  for(const item of items){
   const p=products.find(x=>x.id===item?.id&&x.status==="approved");
   const q=Number(item?.quantity);
   if(!p||!Number.isInteger(q)||q<1||q>20)return NextResponse.json({error:"Produto ou quantidade inválida ou ainda não publicado."},{status:400});
   if(!p.stripePriceId)return NextResponse.json({error:"Este produto ainda não possui preço Stripe configurado."},{status:409});
   line_items.push({quantity:q,price:p.stripePriceId});
   selected.push({id:p.id,name:p.name,price:p.price,quantity:q,stripePriceId:p.stripePriceId});
  }
  const suppliedEmail=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  const email=user?.email||(suppliedEmail&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)?suppliedEmail:"");
  const total=selected.reduce((sum,p)=>sum+p.price*p.quantity,0);
  const orderNumber="PC-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+randomBytes(3).toString("hex").toUpperCase();
  const order=await transaction(async client=>{
   const created=await client.query("INSERT INTO pc_orders(order_number,user_id,customer_email,total_cents,currency,status,payment_status) VALUES($1,$2,$3,$4,'brl','pending','pending') RETURNING id",[orderNumber,user?.id||null,email||("pending+"+orderNumber+"@checkout.invalid"),total]);
   const id=created.rows[0].id as string;
   for(const p of selected)await client.query("INSERT INTO pc_order_items(order_id,product_id,product_name,unit_price_cents,quantity,subtotal_cents,stripe_price_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[id,p.id,p.name,p.price,p.quantity,p.price*p.quantity,p.stripePriceId]);
   return id;
  });
  orderId=order;
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const base=(process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin).replace(/\/$/,"");
  const session=await stripe.checkout.sessions.create({
   mode:"payment",line_items,
   success_url:base+"/sucesso?session_id={CHECKOUT_SESSION_ID}",
   cancel_url:base+"/#carrinho",
   ...(email?{customer_email:email}:{customer_creation:"always"}),
   client_reference_id:user?.id,
   metadata:{store:"pequeno-cristaozinho",order_id:order,order_number:orderNumber,product_ids:[...new Set(selected.map(p=>p.id))].join(",")},
   payment_intent_data:{metadata:{store:"pequeno-cristaozinho",order_id:order,order_number:orderNumber}}
  });
  if(!session.url)throw new Error("Stripe não retornou URL.");
  await query("UPDATE pc_orders SET stripe_checkout_session_id=$2,updated_at=now() WHERE id=$1",[order,session.id]);
  return NextResponse.json({url:session.url,id:session.id,orderNumber});
 }catch(error){
  if(orderId)try{await query("UPDATE pc_orders SET status='failed',payment_status='failed',updated_at=now() WHERE id=$1 AND payment_status<>'paid'",[orderId]);}catch{}
  console.error("Falha ao criar checkout",error instanceof Error?error.message:"erro desconhecido");
  return NextResponse.json({error:"Não foi possível iniciar o checkout. Verifique a configuração do banco e do Stripe."},{status:500});
 }
}
