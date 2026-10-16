import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query, transaction } from "@/lib/db";
export const runtime="nodejs";
export async function POST(request:Request) {
 const stripeSecret=process.env.STRIPE_SECRET_KEY,webhookSecret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!stripeSecret||!webhookSecret)return NextResponse.json({error:"Webhook não configurado."},{status:503});
 const signature=request.headers.get("stripe-signature");if(!signature)return NextResponse.json({error:"Assinatura ausente."},{status:400});
 let event:Stripe.Event;
 try{event=new Stripe(stripeSecret).webhooks.constructEvent(await request.text(),signature,webhookSecret);}
 catch{return NextResponse.json({error:"Assinatura Stripe inválida."},{status:400});}
 const supported=new Set(["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired","charge.refunded"]);
 if(!supported.has(event.type))return NextResponse.json({received:true,ignored:true});
 let emailToSend:string|null=null,orderNumber:string|null=null,orderId:string|null=null,paid=false,refunded=false;
 try{
  const result=await transaction(async client=>{
   const inserted=await client.query("INSERT INTO pc_stripe_events(event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id",[event.id,event.type]);
   if(!inserted.rows.length)return {duplicate:true};
   if(event.type==="charge.refunded"){
    const charge=event.data.object as Stripe.Charge;
    const pi=typeof charge.payment_intent==="string"?charge.payment_intent:null;
    if(pi){const updated=await client.query("UPDATE pc_orders SET status='refunded',payment_status='refunded',updated_at=now() WHERE stripe_payment_intent_id=$1 RETURNING id,order_number",[pi]);if(updated.rows[0]){orderId=updated.rows[0].id;orderNumber=updated.rows[0].order_number;refunded=true;await client.query("UPDATE pc_deliveries SET status='revoked' WHERE order_id=$1",[orderId]);}}
   } else {
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.metadata?.store!=="pequeno-cristaozinho")return {ignored:true};
    const id=session.metadata.order_id;
    if(!id)return {ignored:true};
    const found=await client.query<{id:string;order_number:string;customer_email:string;payment_status:string}>("SELECT id,order_number,customer_email,payment_status FROM pc_orders WHERE id=$1 FOR UPDATE",[id]);
    const order=found.rows[0];if(!order)return {ignored:true};
    orderId=order.id;orderNumber=order.order_number;
    if(event.type==="checkout.session.expired"||event.type==="checkout.session.async_payment_failed"){
      await client.query("UPDATE pc_orders SET status=$2,payment_status=$3,updated_at=now() WHERE id=$1 AND payment_status<>'paid'",[id,event.type==="checkout.session.expired"?"cancelled":"failed",event.type==="checkout.session.expired"?"failed":"failed"]);
    } else if(session.payment_status==="paid"){
      const paymentIntent=typeof session.payment_intent==="string"?session.payment_intent:null;
      await client.query("UPDATE pc_orders SET status='paid',payment_status='paid',stripe_payment_intent_id=COALESCE($2,stripe_payment_intent_id),paid_at=COALESCE(paid_at,now()),updated_at=now() WHERE id=$1",[id,paymentIntent]);
      const items=await client.query<{id:string;product_id:string;private_file_path:string|null}>("SELECT i.id,i.product_id,p.private_file_path FROM pc_order_items i LEFT JOIN pc_products p ON p.id=i.product_id WHERE i.order_id=$1",[id]);
      for(const item of items.rows){
       await client.query("INSERT INTO pc_deliveries(order_id,order_item_id,product_id,private_file_path,status,released_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $5='available' THEN now() ELSE NULL END) ON CONFLICT(order_item_id) DO NOTHING",[id,item.id,item.product_id,item.private_file_path,item.private_file_path?"available":"pending"]);
      }
      emailToSend=order.customer_email;paid=true;
    }
   }
   await client.query("UPDATE pc_stripe_events SET processed_at=now(),result=$2 WHERE event_id=$1",[event.id,paid?"paid":refunded?"refunded":"processed"]);
   return {duplicate:false};
  });
  if("duplicate" in result&&result.duplicate)return NextResponse.json({received:true,duplicate:true});
  if(emailToSend&&paid){
   const apiKey=process.env.RESEND_API_KEY,from=process.env.DELIVERY_FROM_EMAIL,site=(process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin).replace(/\/$/,"");
   if(apiKey&&from){
    const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[emailToSend],subject:"Pagamento confirmado — Pequeno Cristãozinho",html:`<p>Olá!</p><p>Confirmamos o pagamento do pedido <strong>${orderNumber||""}</strong>.</p><p>Você pode consultar seus pedidos e materiais na área Minha Conta:</p><p><a href="${site}/minha-conta">Acessar Minha Conta</a></p><p>Se algum material ainda não estiver disponível, ele será liberado assim que o arquivo final estiver publicado. Para ajuda, abra um chamado na loja.</p>`,text:`Pagamento confirmado para o pedido ${orderNumber||""}. Consulte Minha Conta: ${site}/minha-conta. Materiais em preparação serão liberados após a publicação dos arquivos finais.`})});
    if(!sent.ok)console.error("Resend falhou ao enviar confirmação de pagamento",sent.status);
   } else console.warn("Pagamento registrado; e-mail de confirmação não configurado.");
  }
  return NextResponse.json({received:true,paid,refunded,orderNumber});
 }catch(error){
  console.error("Falha ao processar webhook Stripe:",error instanceof Error?error.message:"erro desconhecido");
  return NextResponse.json({error:"Falha temporária ao processar o evento."},{status:500});
 }
}
