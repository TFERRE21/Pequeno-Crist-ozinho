-- Migration 001: customer accounts, orders, digital deliveries and support.
-- Apply once against the existing PostgreSQL database after taking a backup.
-- This migration is additive and does not drop or rewrite existing tables.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pc_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 160),
  email text NOT NULL,
  whatsapp text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','active','disabled')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS pc_users_email_unique ON pc_users (lower(email));
CREATE INDEX IF NOT EXISTS pc_users_status_idx ON pc_users(status);

CREATE TABLE IF NOT EXISTS pc_email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES pc_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email','password_reset')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_email_tokens_user_purpose_idx ON pc_email_tokens(user_id,purpose,expires_at);

CREATE TABLE IF NOT EXISTS pc_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'brl',
  stripe_product_id text NOT NULL,
  stripe_price_id text NOT NULL,
  cover_path text,
  private_file_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pc_products_stripe_product_unique ON pc_products(stripe_product_id);
CREATE UNIQUE INDEX IF NOT EXISTS pc_products_stripe_price_unique ON pc_products(stripe_price_id);

CREATE TABLE IF NOT EXISTS pc_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES pc_users(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'brl',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled','refunded','failed')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded','partially_refunded')),
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS pc_orders_user_created_idx ON pc_orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS pc_orders_email_created_idx ON pc_orders(lower(customer_email),created_at DESC);
CREATE INDEX IF NOT EXISTS pc_orders_status_idx ON pc_orders(status,payment_status);

CREATE TABLE IF NOT EXISTS pc_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES pc_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  stripe_price_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_order_items_order_idx ON pc_order_items(order_id);

CREATE TABLE IF NOT EXISTS pc_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES pc_orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES pc_order_items(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  private_file_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','revoked','failed')),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_item_id)
);
CREATE INDEX IF NOT EXISTS pc_deliveries_order_status_idx ON pc_deliveries(order_id,status);

CREATE TABLE IF NOT EXISTS pc_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES pc_deliveries(id) ON DELETE CASCADE,
  user_id uuid REFERENCES pc_users(id) ON DELETE SET NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS pc_download_logs_delivery_date_idx ON pc_download_logs(delivery_id,downloaded_at DESC);

CREATE TABLE IF NOT EXISTS pc_stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pc_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES pc_users(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (length(trim(subject)) BETWEEN 3 AND 180),
  category text NOT NULL DEFAULT 'outros',
  initial_message text NOT NULL CHECK (length(trim(initial_message)) BETWEEN 1 AND 10000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting_customer','waiting_human','answered','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_support_user_updated_idx ON pc_support_tickets(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS pc_support_status_priority_idx ON pc_support_tickets(status,priority,updated_at DESC);

CREATE TABLE IF NOT EXISTS pc_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES pc_support_tickets(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES pc_users(id) ON DELETE SET NULL,
  author_type text NOT NULL CHECK (author_type IN ('customer','assistant','admin','system')),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 10000),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_support_messages_ticket_date_idx ON pc_support_messages(ticket_id,created_at);

CREATE TABLE IF NOT EXISTS pc_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'faq',
  content text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES pc_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_knowledge_published_idx ON pc_knowledge_articles(published,category);

CREATE TABLE IF NOT EXISTS pc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES pc_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_audit_entity_date_idx ON pc_audit_log(entity_type,entity_id,created_at DESC);

CREATE TABLE IF NOT EXISTS pc_auth_attempts (
  id bigserial PRIMARY KEY,
  email_key text NOT NULL,
  ip_key text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS pc_auth_attempts_email_time_idx ON pc_auth_attempts(email_key,attempted_at DESC);
CREATE INDEX IF NOT EXISTS pc_auth_attempts_ip_time_idx ON pc_auth_attempts(ip_key,attempted_at DESC);

CREATE TABLE IF NOT EXISTS pc_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_email_outbox_pending_idx ON pc_email_outbox(status,created_at) WHERE status<>'sent';

INSERT INTO pc_knowledge_articles(slug,title,category,content,published) VALUES
('como-comprar','Como comprar','compras','Escolha um material, adicione à sacola e finalize o checkout seguro do Stripe. O pagamento é confirmado pelo sistema por webhook. Guarde o e-mail usado no checkout para localizar o pedido.','true'),
('pagamento','Pagamento e confirmação','pagamento','A confirmação depende do retorno oficial do Stripe. A página de sucesso, isoladamente, não confirma pagamento. Se o pedido não aparecer, abra um chamado com o número do pedido e o e-mail usado na compra.','true'),
('materiais','Acesso aos materiais','downloads','Materiais digitais só podem ser baixados quando o pagamento estiver confirmado e o arquivo final estiver publicado e liberado. Se a compra foi aprovada mas o download não aparece, abra um chamado.','true'),
('impressao','Como imprimir','impressao','Quando o arquivo estiver disponível, confira o formato indicado no produto. Para páginas A4, selecione papel A4, orientação retrato ou paisagem conforme a página, e confira a prévia antes de imprimir.','true'),
('suporte','Como falar com o suporte','suporte','Entre em Minha Conta e abra um chamado com assunto, categoria e descrição do problema. Guarde o protocolo para acompanhar o atendimento.','true')
ON CONFLICT(slug) DO NOTHING;
