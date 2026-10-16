import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {access,readFile} from "node:fs/promises";
import path from "node:path";
import {currentUser} from "@/lib/auth";
import {query} from "@/lib/db";
export const runtime="nodejs";
type Context={params:Promise<{deliveryId:string}>};
export async function GET(request:Request,context:Context){
 try{
  const user=await currentUser();if(!user)return NextResponse.json({error:"Faça login para baixar o material."},{status:401});
  const {deliveryId}=await context.params;
  const r=await query<{id:string;product_id:string;private_file_path:string;product_name:string;order_id:string}>("SELECT d.id,d.product_id,d.private_file_path,i.product_name,o.id AS order_id FROM pc_deliveries d JOIN pc_orders o ON o.id=d.order_id JOIN pc_order_items i ON i.id=d.order_item_id WHERE d.id=$1 AND d.status='available' AND o.user_id=$2 AND o.payment_status='paid'",[deliveryId,user.id]);
  const delivery=r.rows[0];if(!delivery)return NextResponse.json({error:"Material não encontrado ou não liberado para esta conta."},{status:404});
  if(!delivery.private_file_path)return NextResponse.json({error:"O arquivo final ainda não foi publicado. Abra um chamado para acompanhamento."},{status:409});
  const root=path.resolve(process.cwd(),"storage","private-materials");const file=path.resolve(process.cwd(),delivery.private_file_path);
  if(!file.startsWith(root+path.sep))return NextResponse.json({error:"Caminho de arquivo inválido."},{status:500});
  await access(file);const buffer=await readFile(file);
  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  await query("INSERT INTO pc_download_logs(delivery_id,user_id,ip_hash,user_agent) VALUES($1,$2,$3,$4)",[delivery.id,user.id,createHash("sha256").update(ip+(process.env.AUTH_RATE_LIMIT_SALT||"")).digest("hex"),request.headers.get("user-agent")||""]);
  const filename=delivery.product_id.replace(/[^a-z0-9_-]/gi,"-")+(file.toLowerCase().endsWith(".zip")?".zip":file.toLowerCase().endsWith(".jpg")||file.toLowerCase().endsWith(".jpeg")?".jpg":".pdf");
  return new Response(new Uint8Array(buffer),{headers:{"Content-Type":filename.endsWith(".zip")?"application/zip":filename.endsWith(".jpg")?"image/jpeg":"application/pdf","Content-Disposition":`attachment; filename="${filename}"`,"Cache-Control":"private, no-store"}});
 }catch(error){console.error("Falha no download:",error instanceof Error?error.message:"erro desconhecido");return NextResponse.json({error:"Não foi possível baixar o material."},{status:503});}
}
