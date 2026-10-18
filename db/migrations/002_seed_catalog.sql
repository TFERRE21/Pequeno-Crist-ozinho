-- Catalogo Stripe inicial sincronizado com lib/products.ts. Arquivos privados permanecem sem publicação até revisão editorial.
INSERT INTO pc_products(id,name,description,category,price_cents,currency,stripe_product_id,stripe_price_id,private_file_path,status)
VALUES

ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,category=EXCLUDED.category,price_cents=EXCLUDED.price_cents,stripe_product_id=EXCLUDED.stripe_product_id,stripe_price_id=EXCLUDED.stripe_price_id,updated_at=now();
