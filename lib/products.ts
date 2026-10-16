export type Product = { id:string; name:string; category:string; description:string; price:number; emoji:string; age:string; status:"draft"|"approved" };
// Prices are integer cents (BRL). Initial entries are catalog concepts, not finished downloadable files.
export const products: Product[] = [
{id:"moldura-jesus-ama",name:"Moldura — Jesus ama as crianças",category:"Molduras",description:"Arte cristã infantil para imprimir em casa ou na igreja.",price:490,emoji:"🖼️",age:"3–10 anos",status:"approved"},
{id:"moldura-deus-cuida",name:"Quadro — Deus cuida de mim",category:"Molduras",description:"Decoração delicada para quarto infantil ou sala da EBD.",price:490,emoji:"🌈",age:"3–10 anos",status:"approved"},
{id:"frutos-espirito",name:"Frutos do Espírito — pôster",category:"Molduras",description:"Material visual baseado em Gálatas 5:22–23.",price:790,emoji:"🍇",age:"5–12 anos",status:"approved"},
{id:"armadura-de-deus",name:"Armadura de Deus — quadro educativo",category:"Molduras",description:"Recurso visual baseado em Efésios 6:10–18.",price:990,emoji:"🛡️",age:"5–12 anos",status:"approved"},
{id:"devocional-7-dias",name:"7 dias aprendendo com Jesus",category:"Devocionais",description:"Devocional com leitura, conversa e oração diária.",price:990,emoji:"📖",age:"6–10 anos",status:"approved"},
{id:"atividade-criacao",name:"Atividades bíblicas — a criação",category:"Atividades",description:"Atividades para trabalhar a narrativa de Gênesis 1.",price:490,emoji:"🌎",age:"4–8 anos",status:"approved"},
{id:"noe-arca",name:"Noé e a arca — atividades",category:"Atividades",description:"Atividades educativas inspiradas em Gênesis 6–9.",price:590,emoji:"🛶",age:"4–8 anos",status:"approved"},
{id:"cartoes-versiculos",name:"Cartões de versículos para crianças",category:"Professores",description:"Cartões para dinâmica, memorização e lembrancinhas.",price:690,emoji:"💌",age:"5–12 anos",status:"approved"},
{id:"certificado-presenca",name:"Certificados para culto infantil",category:"Professores",description:"Modelo para personalizar encontros e atividades da igreja.",price:490,emoji:"🏅",age:"Todas as idades",status:"approved"},
{id:"kit-culto-infantil",name:"Kit de planejamento para culto infantil",category:"Kits",description:"Conceito de kit com roteiro, atividade e materiais de apoio.",price:2990,emoji:"🎨",age:"Ministério infantil",status:"draft"},
{id:"diario-oracao",name:"Meu diário de oração",category:"Devocionais",description:"Páginas guiadas para registrar pedidos e orações.",price:990,emoji:"🙏",age:"7–12 anos",status:"draft"},
{id:"passaporte-ceu",name:"Passaporte do Céu — recurso infantil",category:"Professores",description:"Material de dinâmica para conversar sobre fé e vida cristã.",price:1290,emoji:"✈️",age:"5–10 anos",status:"draft"}
];
export const formatBRL = (cents:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
