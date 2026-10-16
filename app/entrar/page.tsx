"use client";
import { FormEvent,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function EntrarPage(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);const router=useRouter();
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Não foi possível entrar.");router.push("/minha-conta");router.refresh();}catch(x){setError(x instanceof Error?x.message:"Falha ao entrar.");}finally{setBusy(false);}}
 return <main className="auth-shell"><section className="auth-card"><Link href="/" className="auth-brand">🌱 Pequeno Cristãozinho</Link><p className="eyebrow">BEM-VINDO DE VOLTA</p><h1>Entre na sua conta</h1><p>Acesse seus pedidos, materiais digitais e atendimentos.</p><form onSubmit={submit}><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="notice" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?"Entrando…":"Entrar"}</button></form><p className="auth-foot">Ainda não tem conta? <Link href="/cadastro">Criar cadastro</Link></p><p className="auth-foot"><Link href="/">Voltar à loja</Link></p></section></main>
}
