# Pequeno Cristãozinho — Loja de Artigos Cristãos Infantis

Este repositório foi inicializado para a loja de materiais cristãos infantis descrita no documento de requisitos.

## Escopo planejado
- Catálogo responsivo em português brasileiro para molduras, painéis, devocionais, atividades bíblicas, materiais para professores e kits.
- Fábrica administrativa para gerar conteúdo e arquivos digitais originais (PDF/PNG/JPG/ZIP), mantendo produtos em rascunho até revisão.
- Checkout Stripe em BRL, confirmação de pagamento por webhook e entrega digital protegida.
- Persistência de pedidos, tarefas de geração e arquivos em armazenamento privado.
- SEO, páginas institucionais e testes automatizados.

## Estado atual
O repositório estava vazio e não continha branch/commit anterior. Este README é o primeiro commit de inicialização; não representa uma loja operacional nem uma integração de pagamento validada.

## Próximas etapas
A implementação exige criar a aplicação, banco/migrações e testes, então configurar no ambiente de implantação as variáveis privadas necessárias. Nunca coloque chaves secretas no Git.

Variáveis esperadas para uma implementação Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY` (se necessária ao frontend)
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY=brl`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

Para geração via OpenAI: `OPENAI_API_KEY`. Para persistência, definir também credenciais do banco e do armazenamento privado que forem escolhidos.

## Diretriz de segurança
A confirmação de pagamento deve ocorrer por webhook verificado no servidor. A página de sucesso do navegador nunca deve, sozinha, liberar arquivos. Os arquivos vendidos devem ser privados e acessíveis somente a compradores autorizados após pagamento confirmado.
