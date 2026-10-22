import pg from 'pg';
import { readFileSync } from 'node:fs';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_CA_CERT ? { ca: readFileSync(process.env.DATABASE_CA_CERT, 'utf8') } : {}),
    }
    : false,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});
