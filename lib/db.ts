import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

declare global {
  // Reuse the pool during Next.js hot reloads in development.
  // eslint-disable-next-line no-var
  var __pcPostgresPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRESQL_URI;
  if (!connectionString) throw new Error("Banco não configurado: defina DATABASE_URL (ou POSTGRES_URL) no servidor.");
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: true } : undefined,
  });
}

export function dbPool(): Pool {
  if (!global.__pcPostgresPool) global.__pcPostgresPool = createPool();
  return global.__pcPostgresPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  return dbPool().query<T>(text, values);
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await dbPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
