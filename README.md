# Pequeno Cristãozinho — loja de materiais cristãos infantis

Aplicação Next.js em português brasileiro para catálogo de materiais digitais para famílias, professores de EBD e ministérios infantis.

## Executar localmente
1. Use Node.js 20 ou superior.
2. Copie `.env.example` para `.env.local` e configure as variáveis.
3. Execute `npm install`, `npm test`, `npm run build` e `npm run dev`.
4. Acesse `http://localhost:3000`.

## Implementado nesta etapa
- Loja responsiva com busca, categorias e sacola.
- Catálogo inicial de 12 produtos sincronizados com IDs reais de produtos e preços Stripe em BRL; os itens permanecem em rascunho até os arquivos finais serem gerados e revisados.
- Endpoint de Stripe Checkout em BRL que valida IDs, quantidades e preços no servidor.
- Endpoint webhook que valida assinatura Stripe usando o corpo bruto da requisição.
- Endpoint administrativo protegido por `ADMIN_API_TOKEN` como ponto inicial da fábrica.
- Testes automatizados básicos para catálogo e verificações de segurança.

## Pendências importantes — não está pronto para vendas em produção
O catálogo atual contém 12 produtos registrados no Stripe em modo de produção, com os produtos Stripe desativados até que os arquivos digitais finais sejam gerados e revisados. Os itens aparecem na loja como “Em preparação” e não podem ser adicionados ao carrinho. Não existem 50 produtos com PDFs/PNG/JPG/ZIP validados. A fábrica ainda não gera arquivos, o endpoint webhook ainda não persiste pedidos nem libera downloads, e ainda faltam banco de dados, idempotência persistente, autenticação de administrador completa, armazenamento privado, links temporários, histórico de compras, fluxo de reembolso e páginas institucionais completas. Não anunciar vendas operacionais até implementar e testar esses itens.

## Variáveis de ambiente
- `STRIPE_SECRET_KEY`: chave Stripe secreta; use test key durante validação.
- `STRIPE_WEBHOOK_SECRET`: segredo de assinatura do webhook.
- `STRIPE_CURRENCY=brl`.
- `NEXT_PUBLIC_SITE_URL`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`.
- `OPENAI_API_KEY`: para a futura geração de conteúdo.
- `ADMIN_API_TOKEN`: token aleatório forte para proteger a fábrica.

Nunca publique chaves reais no GitHub. Nenhuma cobrança real foi realizada. A página de sucesso, sozinha, nunca deve liberar downloads. Os produtos Stripe criados para este catálogo estão desativados e não estão liberados para venda.
