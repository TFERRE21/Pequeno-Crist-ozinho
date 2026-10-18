import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query, transaction } from "@/lib/db";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] || c));
}

async function sendPaymentEmail(input: {email:string; orderNumber:string; total:number; site:string; hasDownloads:boolean}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DELIVERY_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("Pagamento confirmado, mas RESEND_API_KEY/DELIVERY_FROM_EMAIL não configurados.");
    return false;
  }
  const amount = new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(input.total / 100);
  const accountUrl = input.site + "/minha-conta";
  const statusText = input.hasDownloads
    ? "Seus materiais já estão disponíveis na área Minha Conta."
    : "Estamos finalizando a preparação dos arquivos deste pedido. Acesse Minha Conta para acompanhar; se necessário, abra um chamado de suporte.";
  const html = `<div style="font-family:Arial,sans-serif;color:#263c33;max-width:600px;margin:auto"><h1>Pagamento confirmado! 💛</h1><p>Obrigado por comprar no Pequeno Cristãozinho.</p><p><strong>Pedido:</strong> ${escapeHtml(input.orderNumber)}<br><strong>Total:</strong> ${amount}</p><p>${statusText}</p><p><a href="${accountUrl}" style="display:inline-block;background:#28684f;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Acessar Minha Conta</a></p><p>Se comprou sem cadastro, crie sua conta usando este mesmo e-mail para vincular o pedido após confirmar seu endereço.</p><p>Com carinho,<br>Equipe Pequeno Cristãozinho</p></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({from,to:[input.email],subject:"Pagamento confirmado — Pequeno Cristãozinho",html,text:`Pagamento confirmado! Pedido ${input.orderNumber}, total ${amount}. ${statusText} Acesse ${accountUrl}. Se comprou sem cadastro, crie sua conta usando este mesmo e-mail e confirme o endereço para vincular o pedido.`})
  });
  if (!response.ok) {
    console.error("Falha ao enviar confirmação de pagamento:", response.status);
    return false;
  }
  return true;
}

async function processPaidSession(session: Stripe.Checkout.Session, event: Stripe.Event, site: string) {
  if (session.payment_status !== "paid") return {processed:false,reason:"payment_not_paid"};
  const orderId = session.metadata?.order_id;
  if (!orderId) throw new Error("Sessão paga sem order_id nos metadados.");
  const email = (session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
  const result = await transaction(async client => {
    const seen = await client.query("INSERT INTO pc_stripe_events(event_id,event_type,result) VALUES($1,$2,'processing') ON CONFLICT(event_id) DO NOTHING RETURNING event_id",[event.id,event.type]);
    if (!seen.rows.length) return {duplicate:true,orderNumber:"",total:0,email:"",hasDownloads:false};
    const orderResult = await client.query<{id:string;order_number:string;total_cents:number;customer_email:string;payment_status:string}>(
      "SELECT id,order_number,total_cents,customer_email,payment_status FROM pc_orders WHERE id=$1 FOR UPDATE",[orderId]);
    const order = orderResult.rows[0];
    if (!order) throw new Error("Pedido não encontrado para a sessão paga.");
    if (session.id && session.id !== (await client.query("SELECT stripe_checkout_session_id FROM pc_orders WHERE id=$1",[orderId])).rows[0]?.stripe_checkout_session_id) {
      throw new Error("Sessão Stripe não corresponde ao pedido.");
    }
    const userResult = email ? await client.query<{id:string}>("SELECT id FROM pc_users WHERE lower(email)=$1 AND status='active' LIMIT 1",[email]) : {rows:[] as {id:string}[]};
    await client.query(
      "UPDATE pc_orders SET customer_email=CASE WHEN $2<>'' THEN $2 ELSE customer_email END,user_id=COALESCE(user_id,$3),status='paid',payment_status='paid',stripe_payment_intent_id=$4,paid_at=COALESCE(paid_at,now()),updated_at=now() WHERE id=$1",
      [orderId,email,userResult.rows[0]?.id || null,typeof session.payment_intent==="string"?session.payment_intent:null]
    );
    const items = await client.query<{id:string;product_id:string;private_file_path:string|null}>(
      "SELECT i.id,i.product_id,p.private_file_path FROM pc_order_items i LEFT JOIN pc_products p ON p.id=i.product_id WHERE i.order_id=$1",[orderId]);
    let hasDownloads = false;
    for (const item of items.rows) {
      const path = item.private_file_path;
      const available = !!path;
      const inserted = await client.query(
        "INSERT INTO pc_deliveries(order_id,order_item_id,product_id,private_file_path,status,released_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $5='available' THEN now() ELSE NULL END) ON CONFLICT(order_item_id) DO UPDATE SET private_file_path=COALESCE(pc_deliveries.private_file_path,EXCLUDED.private_file_path),status=CASE WHEN pc_deliveries.status='revoked' THEN 'revoked' WHEN COALESCE(pc_deliveries.private_file_path,EXCLUDED.private_file_path) IS NOT NULL THEN 'available' ELSE pc_deliveries.status END,released_at=CASE WHEN COALESCE(pc_deliveries.private_file_path,EXCLUDED.private_file_path) IS NOT NULL THEN COALESCE(pc_deliveries.released_at,now()) ELSE pc_deliveries.released_at END RETURNING status,private_file_path",
        [orderId,item.id,item.product_id,path,available?"available":"pending"]
      );
      if (inserted.rows[0]?.status === "available" && inserted.rows[0]?.private_file_path) hasDownloads = true;
    }
    await client.query("UPDATE pc_stripe_events SET processed_at=now(),result='payment_confirmed' WHERE event_id=$1",[event.id]);
    return {duplicate:false,orderNumber:order.order_number,total:Number(order.total_cents),email:email||order.customer_email,hasDownloads};
  });
  if ("duplicate" in result && result.duplicate) return {processed:true,duplicate:true};
  let emailSent = false;
  if (result.email && !result.email.endsWith("@checkout.invalid")) {
    try { emailSent = await sendPaymentEmail({email:result.email,orderNumber:result.orderNumber,total:result.total,site,hasDownloads:result.hasDownloads}); }
    catch (error) { console.error("Erro no e-mail de confirmação:",error instanceof Error?error.message:"desconhecido"); }
  }
  return {processed:true,emailSent,hasDownloads:result.hasDownloads};
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const hook = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !hook) return NextResponse.json({error:"Webhook não configurado."},{status:503});
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({error:"Assinatura ausente."},{status:400});
  const stripe = new Stripe(secret);
  const rawBody = await request.text();
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(rawBody,signature,hook); }
  catch { return NextResponse.json({error:"Assinatura inválida."},{status:400}); }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/,"");
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          const result = await processPaidSession(session,event,site);
          return NextResponse.json({received:true,...result});
        }
        return NextResponse.json({received:true,processed:false,reason:"payment_not_paid"});
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId) await query("UPDATE pc_orders SET status='failed',payment_status='failed',updated_at=now() WHERE id=$1 AND payment_status<>'paid'",[orderId]);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (paymentIntent) await transaction(async client => {
          await client.query("UPDATE pc_orders SET status='refunded',payment_status='refunded',updated_at=now() WHERE stripe_payment_intent_id=$1",[paymentIntent]);
          await client.query("UPDATE pc_deliveries SET status='revoked' WHERE order_id IN (SELECT id FROM pc_orders WHERE stripe_payment_intent_id=$1)",[paymentIntent]);
          await client.query("INSERT INTO pc_stripe_events(event_id,event_type,processed_at,result) VALUES($1,$2,now(),'refund_recorded') ON CONFLICT(event_id) DO NOTHING",[event.id,event.type]);
        });
        break;
      }
      default:
        await query("INSERT INTO pc_stripe_events(event_id,event_type,processed_at,result) VALUES($1,$2,now(),'ignored') ON CONFLICT(event_id) DO NOTHING",[event.id,event.type]);
    }
    return NextResponse.json({received:true,processed:true});
  } catch (error) {
    console.error("Falha ao processar webhook Stripe:",error instanceof Error?error.message:"erro desconhecido");
    return NextResponse.json({error:"Falha ao processar evento."},{status:500});
  }
}
