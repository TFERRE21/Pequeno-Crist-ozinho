import { NextResponse } from "next/server";
import Stripe from "stripe";
import { products } from "@/lib/products";
export const runtime = "nodejs";
export async function POST(request: Request) {
 try {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({error:"Pagamento ainda não configurado: falta STRIPE_SECRET_KEY no servidor."},{status:503});
  const body=await request.json(); const items=body?.items;
  if(!Array.isArray(items)||items.length===0||items.length>30) return NextResponse.json({error:"Carrinho inválido."},{status:400});
  const line_items:Stripe.Checkout.SessionCreateParams.LineItem[]=[];
  for(const item of items){const p=products.find(x=>x.id===item?.id&&x.status==="approved");const q=Number(item?.quantity);if(!p||!Number.isInteger(q)||q<1||q>20)return NextResponse.json({error:"Produto ou quantidade inválida."},{status:400});line_items.push({quantity:q,price_data:{currency:(process.env.STRIPE_CURRENCY||"brl").toLowerCase(),unit_amount:p.price,product_data:{name:p.name,description:p.description}}});}
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const base=(process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin).replace(/\/$/,"");
  const session=await stripe.checkout.sessions.create({mode:"payment",line_items,success_url:process.env.STRIPE_SUCCESS_URL||base+"/sucesso?session_id={CHECKOUT_SESSION_ID}",cancel_url:process.env.STRIPE_CANCEL_URL||base+"/#carrinho",metadata:{store:"pequeno-cristaozinho"}});
  if(!session.url)throw new Error("Stripe não retornou URL.");return NextResponse.json({url:session.url,id:session.id});
 }catch(error){console.error("Falha ao criar checkout",error instanceof Error?error.message:"erro desconhecido");return NextResponse.json({error:"Não foi possível iniciar o checkout. Verifique a configuração Stripe."},{status:500});}
}
