import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import JSZip from "jszip";
export const runtime = "nodejs";
function verify(token:string,secret:string):any {
 const [data,sig]=token.split("."); if(!data||!sig)return null;
 const expected=createHmac("sha256",secret).update(data).digest();
 const actual=Buffer.from(sig,"base64url");
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{return JSON.parse(Buffer.from(data,"base64url").toString("utf8"));}catch{return null;}
}
async function makePdf(svgs:string[]) {
 return await new Promise<Buffer>((resolve,reject)=>{
  const doc=new PDFDocument({size:"A4",margin:0,autoFirstPage:false,compress:true}); const chunks:Buffer[]=[];
  doc.on("data",(chunk:Buffer)=>chunks.push(chunk)); doc.on("end",()=>resolve(Buffer.concat(chunks))); doc.on("error",reject);
  for(const svg of svgs){doc.addPage({size:"A4",margin:0}); SVGtoPDF(doc,svg,0,0,{width:595.28,height:841.89});}
  doc.end();
 });
}
export async function GET(request:Request) {
 const secret=process.env.DELIVERY_TOKEN_SECRET; if(!secret)return NextResponse.json({error:"Entrega não configurada."},{status:503});
 const token=new URL(request.url).searchParams.get("token")||""; const data=verify(token,secret);
 if(!data||data.product!=="caderno-atividades-biblicas"||typeof data.sessionId!=="string"||!Number.isInteger(data.expiresAt)||data.expiresAt<=Math.floor(Date.now()/1000))return NextResponse.json({error:"Link inválido ou expirado. Entre em contato com o suporte."},{status:401});
 try{
  const dir=path.join(process.cwd(),"public","materiais","caderno-biblico");
  const names=(await readdir(dir)).filter(n=>/^pagina-\d{2}-.*\.svg$/.test(n)).sort();
  if(names.length!==12)throw new Error("Esperadas 12 páginas SVG; encontradas "+names.length);
  const svgs=await Promise.all(names.map(n=>readFile(path.join(dir,n),"utf8")));
  const zip=new JSZip(); names.forEach((n,i)=>zip.file("paginas/"+n,svgs[i]));
  zip.file("Caderno_Atividades_Biblicas_A4.pdf",await makePdf(svgs));
  zip.file("LEIA-ME.txt","Pequeno Cristãozinho — Caderno de Atividades Bíblicas Infantis. Inclui 12 páginas SVG individuais e PDF completo em A4. Imprima em A4, retrato, cores ativadas.\n");
  const buffer=await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE",compressionOptions:{level:6}});
  return new Response(new Uint8Array(buffer),{status:200,headers:{"Content-Type":"application/zip","Content-Disposition":"attachment; filename=\"Caderno_Atividades_Biblicas_A4.zip\"","Cache-Control":"private, no-store","Content-Length":String(buffer.length)}});
 }catch(error){console.error("Falha ao montar arquivo",error instanceof Error?error.message:"erro desconhecido");return NextResponse.json({error:"Não foi possível montar o pacote de impressão."},{status:500});}
}
