## Entrega automática do Caderno Bíblico

A entrega é feita somente após o Stripe confirmar o pagamento. O produto precisa existir em `lib/products.ts` com o ID exato `caderno-atividades-biblicas` e estar aprovado antes de poder ser comprado. Não aprove o produto até concluir a revisão editorial.

Configure estas variáveis no servidor/deploy:
- `STRIPE_SECRET_KEY`: chave secreta Stripe do mesmo modo (teste ou produção) usado pelo site.
- `STRIPE_WEBHOOK_SECRET`: segredo do endpoint Stripe que aponta para `/api/stripe/webhook`.
- `DELIVERY_TOKEN_SECRET`: segredo aleatório forte, exclusivo para assinar links temporários de entrega.
- `RESEND_API_KEY`: chave da API Resend.
- `DELIVERY_FROM_EMAIL`: remetente verificado no Resend, por exemplo um endereço do domínio da loja.
- `NEXT_PUBLIC_SITE_URL`: URL pública HTTPS do site, sem barra final.

No Stripe, configure o endpoint `https://SEU-DOMINIO/api/stripe/webhook` para os eventos `checkout.session.completed` e `checkout.session.async_payment_succeeded`.

O link enviado por email expira em 7 dias e é assinado no servidor. O pacote contém as 12 páginas SVG individuais e um PDF A4 compilado a partir delas. Antes de ativar vendas, valide as variáveis no ambiente de deploy, execute um pagamento de teste, confirme o email recebido e abra/imprima o PDF em A4. O produto segue em rascunho enquanto a revisão visual não for aprovada.
