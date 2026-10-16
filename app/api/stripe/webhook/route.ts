import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createHmac } from "node:crypto";
export const runtime = "nodejs";
function signPayload(payload:string, secret:string) {
 const data=Buffer.from(payload).toString("base64url");
 const signature=createHmac("sha256",secret).update(data).digest("base64url");
 return data+"."+signature;
}
export async function POST(request:Request) {
 const stripeSecret=process.env.STRIPE_SECRET_KEY, webhookSecret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!stripeSecret||!webhookSecret) return NextResponse.json({error:"Webhook não configurado."},{status:503});
 const signature=request.headers.get("stripe-signature");
 if(!signature) return NextResponse.json({error:"Assinatura ausente."},{status:400});
 let event:Stripe.Event;
 try { event=new Stripe(stripeSecret).webhooks.constructEvent(await request.text(),signature,webhookSecret); }
 catch { return NextResponse.json({error:"Assinatura Stripe inválida."},{status:400}); }
 if(event.type!=="checkout.session.completed"&&event.type!=="checkout.session.async_payment_succeeded") return NextResponse.json({received:true});
 const session=event.data.object as Stripe.Checkout.Session;
 if(session.payment_status!=="paid"||session.metadata?.store!=="pequeno-cristaozinho") return NextResponse.json({received:true,skipped:"not-paid-or-wrong-store"});
 const ids=(session.metadata?.product_ids||"").split(",").filter(Boolean);
 if(!ids.includes("caderno-atividades-biblicas")) return NextResponse.json({received:true,skipped:"no-deliverable-product"});
 const email=session.customer_details?.email||session.customer_email;
 const secret=process.env.DELIVERY_TOKEN_SECRET, resend=process.env.RESEND_API_KEY, from=process.env.DELIVERY_FROM_EMAIL, site=(process.env.NEXT_PUBLIC_SITE_URL||"").replace(/\/$/,"");
 if(!email||!secret||!resend||!from||!site) return NextResponse.json({error:"Entrega não configurada; confira variáveis de email e segurança."},{status:503});
 const token=signPayload(JSON.stringify({product:"caderno-atividades-biblicas",sessionId:session.id,expiresAt:Math.floor(Date.now()/1000)+7*86400}),secret);
 const link=site+"/api/download/caderno-biblico?token="+encodeURIComponent(token);
 const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resend,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject:"Seu Caderno de Atividades Bíblicas está pronto",html:"<p>Olá!</p><p>Obrigado pela compra do <strong>Caderno de Atividades Bíblicas Infantis</strong>.</p><p><a href=\""+link+"\">Baixar o material pronto para impressão</a></p><p>O link expira em 7 dias. Salve os arquivos após baixar.</p><p>Pequeno Cristãozinho</p>",text:"Obrigado pela compra! Baixe seu caderno (link válido por 7 dias): "+link})});
 if(!sent.ok){console.error("Resend delivery email failed",sent.status);return NextResponse.json({error:"Pagamento confirmado, mas o email não foi enviado."},{status:502});}
 return NextResponse.json({received:true,deliveryEmailSent:true});
}
