import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});

pool.on('error', (error) => {
  console.error('Unexpected database error:', error);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export default pool;
