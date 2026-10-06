import fs from 'node:fs';
import { createApp } from './server/app.js';
import config from './server/config/index.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = createApp();
app.listen(config.port, () => {
  console.log(`Vega API listening on http://localhost:${config.port}`);
});
