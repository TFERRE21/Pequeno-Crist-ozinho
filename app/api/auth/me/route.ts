import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
export const runtime="nodejs";
export async function GET() {
  try { const user=await currentUser(); if(!user)return NextResponse.json({user:null},{status:401}); return NextResponse.json({user}); }
  catch { return NextResponse.json({error:"Autenticação indisponível."},{status:503}); }
}
