const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRESQL_URI;
  if (!connectionString) throw new Error("Defina DATABASE_URL (ou POSTGRES_URL) no ambiente.");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 8000, ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: true } : undefined });
  const client = await pool.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS pc_schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const name = "001_accounts_orders_support.sql";
    const existing = await client.query("SELECT name FROM pc_schema_migrations WHERE name=$1", [name]);
    if (existing.rows.length) { console.log(name + " já aplicada; nada a fazer."); return; }
    const file = path.join(process.cwd(), "db", "migrations", name);
    const sql = fs.readFileSync(file, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO pc_schema_migrations(name) VALUES($1)", [name]);
      await client.query("COMMIT");
      console.log(name + " aplicada com sucesso.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(error => { console.error("Falha ao aplicar migração:", error.message); process.exitCode = 1; });
