import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import JSZip from "jszip";
import { products } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lesson = { reference: string; message: string; activity: string };
function lessonFor(id: string, category: string): Lesson {
  const s = id.toLowerCase();
  if (s.includes("frutos")) return { reference: "Gálatas 5:22–23", message: "Amor, alegria, paz, paciência, bondade, fidelidade, mansidão e domínio próprio são atitudes que podemos praticar no cotidiano.", activity: "Desenhe uma árvore e escreva atitudes boas em suas folhas. Escolha uma atitude para praticar esta semana." };
  if (s.includes("armadura")) return { reference: "Efésios 6:10–18", message: "A armadura de Deus nos lembra da verdade, justiça, paz, fé, salvação e da Palavra de Deus.", activity: "Desenhe uma armadura e escreva ao lado de cada peça uma atitude que ajude você a fazer o bem." };
  if (s.includes("criacao")) return { reference: "Gênesis 1:31", message: "A criação nos convida a agradecer pelo mundo e a cuidar das pessoas, dos animais e da natureza.", activity: "Desenhe três coisas da criação pelas quais você é grato e escreva uma maneira de cuidar delas." };
  if (s.includes("noe")) return { reference: "Gênesis 9:13", message: "A história de Noé fala sobre confiança, obediência e a aliança representada pelo arco-íris.", activity: "Pinte um arco-íris e complete: posso demonstrar confiança quando..." };
  if (s.includes("davi")) return { reference: "1 Samuel 17:45", message: "Davi enfrentou um grande desafio com coragem e confiança em Deus.", activity: "Desenhe uma funda e cinco pedras. Em cada pedra, escreva uma qualidade que ajuda a enfrentar desafios com responsabilidade." };
  if (s.includes("daniel")) return { reference: "Daniel 6:23", message: "Daniel manteve sua fé e sua rotina de oração mesmo diante de dificuldades.", activity: "Desenhe a cena da história e escreva uma forma saudável de demonstrar coragem e pedir ajuda." };
  if (s.includes("natal")) return { reference: "Lucas 2:11", message: "O nascimento de Jesus é uma história de esperança, alegria e amor.", activity: "Desenhe uma estrela e escreva uma forma de compartilhar alegria com alguém." };
  if (s.includes("ressurreicao")) return { reference: "Mateus 28:6", message: "A ressurreição de Jesus é celebrada pelos cristãos como sinal de esperança.", activity: "Desenhe símbolos de esperança e explique com suas palavras o que eles significam." };
  if (s.includes("samaritano")) return { reference: "Lucas 10:27", message: "Amar o próximo é perceber quem precisa de ajuda e agir com compaixão.", activity: "Escreva ou desenhe uma pequena atitude de cuidado que você pode praticar nesta semana." };
  if (s.includes("identidade")) return { reference: "Salmo 139:14", message: "Cada criança tem valor e merece ser tratada com dignidade, amor e respeito.", activity: "Escreva três qualidades suas e uma maneira de usar cada uma para fazer o bem." };
  if (s.includes("oracao") || s.includes("oração")) return { reference: "Filipenses 4:6", message: "A oração é um momento para agradecer, pedir ajuda e expressar o que sentimos.", activity: "Registre um agradecimento, um pedido e o nome de alguém por quem você gostaria de orar." };
  if (s.includes("passaporte")) return { reference: "João 14:6", message: "Este recurso simbólico ajuda a conversar sobre fé, escolhas e crescimento cristão.", activity: "Complete uma etapa com uma leitura, uma conversa em família e uma atitude de amor ao próximo." };
  if (s.includes("bom-pastor") || s.includes("pastor")) return { reference: "Salmo 23:1", message: "A imagem do bom pastor lembra cuidado, orientação e proteção.", activity: "Desenhe um caminho seguro e escreva quem ajuda você a aprender e crescer." };
  if (s.includes("ebd") || s.includes("aula") || s.includes("professor")) return { reference: "2 Timóteo 3:16", message: "O ensino bíblico para crianças pode unir leitura, conversa, participação e cuidado com cada faixa etária.", activity: "Planeje uma pergunta de abertura, uma atividade prática, uma aplicação para a semana e uma oração final." };
  if (s.includes("painel")) return { reference: "Marcos 10:14", message: "Um ambiente acolhedor ajuda as crianças a se sentirem recebidas e valorizadas.", activity: "Personalize o material com o nome do evento, data, turma e comunidade. Confira a escala de impressão antes de montar." };
  if (s.includes("cartao") || s.includes("versiculo")) return { reference: "Salmo 119:11", message: "Lembrar um versículo pode ajudar a conversar sobre atitudes de amor e sabedoria.", activity: "Leia a referência, explique a mensagem com suas palavras e pense em uma aplicação prática." };
  if (s.includes("certificado")) return { reference: "Colossenses 3:23", message: "Celebramos a participação, o esforço, a curiosidade e a alegria de aprender.", activity: "Preencha nome, atividade, data e assinatura da pessoa responsável." };
  if (s.includes("memoria")) return { reference: "Deuteronômio 6:6–7", message: "Relembrar histórias e ensinamentos ajuda a conversar sobre a fé no cotidiano.", activity: "Imprima as cartas, recorte nas linhas e encontre os pares. Adultos podem adaptar a dificuldade." };
  if (category === "Molduras") return { reference: "Marcos 10:14", message: "As crianças são preciosas e merecem cuidado, carinho e orientação.", activity: "Desenhe ou pinte o espaço criativo e converse sobre uma forma de demonstrar amor hoje." };
  if (category === "Devocionais") return { reference: "Salmo 119:105", message: "A Palavra de Deus pode orientar nossas escolhas e nos ajudar a praticar o bem.", activity: "Leia, converse, escreva uma resposta e termine com uma oração, se fizer sentido à sua família." };
  if (category === "Kits") return { reference: "Colossenses 3:16", message: "Um bom recurso para o ministério infantil combina conteúdo bíblico, participação e cuidado com cada criança.", activity: "Adapte o roteiro à idade, ao tempo disponível e às necessidades do grupo." };
  return { reference: "Provérbios 2:6", message: "Aprender pode envolver leitura, observação, desenho, perguntas e brincadeiras.", activity: "Faça a atividade com calma e converse com um adulto sobre o que descobriu." };
}

async function makePdf(product: (typeof products)[number]): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 54, bottom: 54, left: 52, right: 52 }, info: { Title: product.name, Author: "Pequeno Cristãozinho", Subject: "Material cristão infantil para impressão" } });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const green = "#355D4B";
  const muted = "#687A70";
  const gold = "#9B765B";
  const lesson = lessonFor(product.id, product.category);
  const line = (y: number) => { doc.moveTo(54, y).lineTo(541, y).strokeColor("#DCE9D8").lineWidth(1).stroke(); };
  const heading = (text: string) => { doc.moveDown(0.7); doc.fillColor(green).font("Helvetica-Bold").fontSize(16).text(text); doc.moveDown(0.4); doc.fillColor("#263C33").font("Helvetica").fontSize(10.5); };
  const footer = (page: string) => { line(785); doc.fillColor(muted).font("Helvetica").fontSize(7.5).text("Pequeno Cristãozinho • Material digital educativo", 54, 795, { width: 350 }); doc.text(page, 500, 795, { width: 41, align: "right" }); };

  doc.rect(0, 0, 595, 842).fill("#FFFCF5");
  doc.fillColor(gold).font("Helvetica-Bold").fontSize(10).text("PEQUENO CRISTÃOZINHO", 54, 92, { align: "center", width: 487, characterSpacing: 1.8 });
  doc.moveDown(2);
  doc.fillColor(green).font("Helvetica-Bold").fontSize(25).text(product.name, 70, 180, { align: "center", width: 455 });
  doc.moveDown(1);
  doc.fillColor(muted).font("Helvetica").fontSize(12).text(product.description, 90, doc.y + 5, { align: "center", width: 415, lineGap: 4 });
  doc.roundedRect(100, 360, 395, 78, 12).fill("#E9F0E3");
  doc.fillColor(green).font("Helvetica-Bold").fontSize(12).text("FÉ  •  APRENDIZADO  •  ALEGRIA", 115, 389, { width: 365, align: "center" });
  doc.fillColor(muted).font("Helvetica").fontSize(10).text("Faixa etária: " + product.age, 100, 475, { width: 395, align: "center" });
  doc.fillColor(muted).fontSize(8.5).text("Versão inicial para revisão editorial e validação antes da comercialização.", 90, 690, { width: 415, align: "center" });
  footer("1");
  doc.addPage({ size: "A4", margins: { top: 54, bottom: 54, left: 52, right: 52 } });
  doc.fillColor("#FFFCF5").rect(0, 0, 595, 842).fill();
  doc.fillColor(green).font("Helvetica-Bold").fontSize(18).text("Guia de uso", 54, 58);
  doc.moveDown(0.6);
  doc.fillColor("#263C33").font("Helvetica").fontSize(10.5).text("Objetivo: oferecer um recurso cristão infantil que estimule conversa, criatividade, participação e aplicação prática. Use o material com acompanhamento de um adulto ou educador.", { lineGap: 4 });
  heading("Referência bíblica");
  doc.fillColor(gold).font("Helvetica-Bold").fontSize(13).text(lesson.reference);
  doc.moveDown(0.3);
  doc.fillColor("#263C33").font("Helvetica").fontSize(10.5).text(lesson.message, { lineGap: 4 });
  heading("Atividade principal");
  doc.text(lesson.activity, { lineGap: 4 });
  heading("Converse e registre");
  doc.font("Helvetica").fontSize(10).text("Meu nome: ______________________________________________________________");
  doc.moveDown(0.8);
  doc.text("O que aprendi hoje?");
  doc.moveDown(0.5); doc.text("____________________________________________________________________________");
  doc.moveDown(0.5); doc.text("____________________________________________________________________________");
  doc.moveDown(0.6); doc.text("Uma atitude que vou praticar nesta semana:");
  doc.moveDown(0.5); doc.text("____________________________________________________________________________");
  doc.moveDown(0.5); doc.text("____________________________________________________________________________");
  doc.moveDown(0.6); doc.text("Data: ____ / ____ / ______     Turma: ______________________________");
  footer("2");
  doc.addPage({ size: "A4", margins: { top: 54, bottom: 54, left: 52, right: 52 } });
  doc.fillColor("#FFFCF5").rect(0, 0, 595, 842).fill();
  heading("Conversa em família ou na turma");
  const prompts = [
    "1. O que mais chamou sua atenção nesta história ou atividade?",
    "____________________________________________________________________________",
    "____________________________________________________________________________",
    "2. Como podemos praticar essa lição durante a semana?",
    "____________________________________________________________________________",
    "____________________________________________________________________________",
    "3. Por quem podemos orar ou a quem podemos ajudar?",
    "____________________________________________________________________________",
    "____________________________________________________________________________"
  ];
  prompts.forEach((lineText, i) => { doc.fillColor("#263C33").font(i % 3 === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(10).text(lineText, { lineGap: 3 }); doc.moveDown(i % 3 === 0 ? 0.65 : 0.45); });
  heading("Registro do educador");
  doc.font("Helvetica").fontSize(10).text("Observações: _______________________________________________________________");
  doc.moveDown(0.7); doc.text("____________________________________________________________________________");
  doc.moveDown(0.7); doc.text("____________________________________________________________________________");
  doc.moveDown(1.2);
  doc.fillColor(muted).fontSize(8).text("Controle de qualidade: confira ortografia, referências bíblicas, adequação à faixa etária e acabamento gráfico antes de vender este material. Esta versão é um protótipo editorial, não um produto final premium.", { lineGap: 3 });
  footer("3");
  doc.end();
  return finished;
}

export async function POST(request: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return NextResponse.json({ error: "Configure ADMIN_API_TOKEN no servidor antes de usar a fábrica." }, { status: 503 });
  const supplied = request.headers.get("x-admin-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied || supplied.length !== token.length || !Buffer.from(supplied).equals(Buffer.from(token))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const zip = new JSZip();
    zip.file("LEIA-ME.txt", "PEQUENO CRISTÃOZINHO — LOTE INICIAL\n\nEste arquivo contém protótipos editoriais em PDF. Revise e melhore cada material antes de comercializar. Produtos Stripe permanecem bloqueados até a aprovação dos arquivos finais.\n");
    zip.file("catalogo.json", JSON.stringify(products.map(p => ({ id: p.id, name: p.name, category: p.category, price_cents: p.price, age: p.age, stripeProductId: p.stripeProductId, stripePriceId: p.stripePriceId, status: p.status })), null, 2));
    for (const product of products) {
      const pdf = await makePdf(product);
      zip.file("pdfs/" + product.id + ".pdf", pdf);
    }
    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return new Response(new Uint8Array(archive), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="Pequeno_Cristaozinho_50_PDFs.zip"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Falha ao fabricar catálogo:", error instanceof Error ? error.message : "erro desconhecido");
    return NextResponse.json({ error: "Não foi possível fabricar o catálogo." }, { status: 500 });
  }
}
