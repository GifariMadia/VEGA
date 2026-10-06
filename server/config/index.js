import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export const config = {
  port: Number(process.env.PORT || 4000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'vega_db',
    user: process.env.DB_USER || 'vega_user',
    password: process.env.DB_PASSWORD || 'vega_pass',
  },
  python: {
    bin: process.env.PYTHON_BIN || (process.platform === 'win32' ? 'py' : 'python3'),
    cwd: path.resolve(projectRoot, 'backend', 'python'),
  },
  uploadDir: path.resolve(projectRoot, 'tmp', 'uploads'),
};

export default config;
