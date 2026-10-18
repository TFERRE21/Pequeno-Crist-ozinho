# Pequeno Cristãozinho — loja de materiais cristãos infantis

Aplicação Next.js em português brasileiro para catálogo de materiais digitais para famílias, professores de EBD e ministérios infantis.

## Executar localmente
1. Use Node.js 20 ou superior.
2. Copie `.env.example` para `.env.local` e configure as variáveis.
3. Execute `npm install`, `npm test`, `npm run build` e `npm run dev`.
4. Acesse `http://localhost:3000`.

## Geração dos 12 cadernos de atividades

Foi adicionado `scripts/generate-materials.cjs`, que gera 12 PDFs A4 iniciais para os produtos de atividades bíblicas definidos no projeto. Para gerar no ambiente de execução, use `npm run materials:generate`. Os arquivos são gravados em `storage/private-materials/`, fora de `public/` e ignorados pelo Git. A geração é um primeiro rascunho editorial: requer revisão visual, conferência pedagógica e testes de impressão antes de associar os arquivos a produtos vendidos. O comando ainda precisa ser executado no VPS e os PDFs precisam ser inspecionados.

## Implementado nesta etapa
- Loja responsiva com busca, categorias e sacola.
- Catálogo inicial de 50 produtos sincronizados com IDs reais de produtos e preços Stripe em BRL; os itens permanecem em rascunho até os arquivos finais serem gerados e revisados.
- Endpoint de Stripe Checkout em BRL que valida IDs, quantidades e preços no servidor.
- Endpoint webhook que valida assinatura Stripe usando o corpo bruto da requisição.
- Fábrica protegida em `POST /api/admin/fabricar` (header `x-admin-token` com `ADMIN_API_TOKEN`) para gerar um ZIP com 50 PDFs iniciais e `catalogo.json`.
- Testes automatizados básicos para catálogo e verificações de segurança.

## Pendências importantes — não está pronto para vendas em produção
O catálogo atual contém 50 produtos registrados no Stripe em modo de produção, com os produtos Stripe desativados até que os arquivos digitais finais sejam gerados e revisados. Os itens aparecem na loja como “Em preparação” e não podem ser adicionados ao carrinho. Não existem 50 produtos com PDFs/PNG/JPG/ZIP validados. A fábrica ainda não gera arquivos, o endpoint webhook ainda não persiste pedidos nem libera downloads, e ainda faltam banco de dados, idempotência persistente, autenticação de administrador completa, armazenamento privado, links temporários, histórico de compras, fluxo de reembolso e páginas institucionais completas. Os 50 PDFs gerados pela fábrica são protótipos editoriais de primeira versão; precisam de revisão e aprimoramento visual antes da venda. O endpoint de fábrica gera o ZIP sob demanda e não libera produtos no Stripe. Não anunciar vendas operacionais até implementar e testar os itens pendentes.

## Variáveis de ambiente
- `STRIPE_SECRET_KEY`: chave Stripe secreta; use test key durante validação.
- `STRIPE_WEBHOOK_SECRET`: segredo de assinatura do webhook.
- `STRIPE_CURRENCY=brl`.
- `NEXT_PUBLIC_SITE_URL`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`.
- `OPENAI_API_KEY`: para a futura geração de conteúdo.
- `ADMIN_API_TOKEN`: token aleatório forte para proteger a fábrica.

Nunca publique chaves reais no GitHub. Nenhuma cobrança real foi realizada. A página de sucesso, sozinha, nunca deve liberar downloads. Os produtos Stripe criados para este catálogo estão desativados e não estão liberados para venda.


## Autenticação, conta, pedidos e suporte (nova base de implementação)

Foi adicionada uma base inicial de autenticação por senha com hash bcrypt, cookie de sessão HttpOnly, confirmação de e-mail, recuperação de senha, limitação de tentativas de login, área Minha Conta, APIs de pedidos/materiais, chamados persistidos, assistente de suporte com OpenAI no backend e endpoints administrativos protegidos por papel de usuário.

### Variáveis adicionais

- `DATABASE_URL` (ou `POSTGRES_URL` / `POSTGRESQL_URI`): conexão com PostgreSQL existente.
- `AUTH_SECRET`: segredo aleatório de pelo menos 32 caracteres.
- `AUTH_RATE_LIMIT_SALT`: sal aleatório para hashes de origem.
- `RESEND_API_KEY` e `DELIVERY_FROM_EMAIL`: e-mails de verificação, recuperação e confirmação de pagamento.
- `OPENAI_API_KEY` e opcionalmente `SUPPORT_AI_MODEL`: atendimento por IA.

### Migração de banco

1. Faça backup do banco PostgreSQL já utilizado pelo projeto.
2. Configure as variáveis no VPS.
3. Instale as dependências: `npm install`.
4. Execute `npm run db:migrate` para aplicar as migrações pendentes, criar as tabelas aditivas e sincronizar os 50 produtos iniciais no catálogo PostgreSQL.
5. Rode `npm test` e `npm run build` antes de publicar.

A migração é aditiva e não remove tabelas existentes. A execução no banco real ainda precisa ser feita pelo operador do VPS.

### Rotas novas

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/account/orders`, `GET /api/account/materials`, `GET /api/account/download/:deliveryId`
- `GET/POST /api/account/support`, `GET/POST /api/account/support/:ticketId/messages`, `POST /api/account/support/assistant`
- `GET/PATCH /api/admin/support`, `GET/POST /api/admin/support/:ticketId/messages`, `GET/POST /api/admin/knowledge`

### Pendências antes de produção

- O código foi gravado no GitHub, mas ainda precisa de instalação de dependências, execução de migração, testes automatizados e build. Não afirmar que está funcionando no VPS até confirmar essas etapas.
- A conta administrativa deve ser criada/promovida manualmente por operador autorizado no banco; não há cadastro público de administradores.
- A confirmação de pagamento é persistida via webhook; arquivos sem caminho privado publicado permanecem como entrega pendente. A confirmação por e-mail usa `RESEND_API_KEY` e `DELIVERY_FROM_EMAIL`. Pedidos feitos como convidado podem ser vinculados a uma conta após o cliente criar a conta com o mesmo e-mail e confirmar o endereço. Os materiais precisam ser produzidos, inspecionados e vinculados antes de venda.
- A política de reembolso, dados legais da loja e canal de contato devem ser completados e revisados pelo responsável.
- A entrega por e-mail ainda precisa de uma rotina de reenvio/outbox operacional para garantir novas tentativas quando o provedor falhar.
- A IA de suporte usa a base oficial publicada e os pedidos do usuário autenticado; a integração deve ser testada com a chave e o modelo configurados.
