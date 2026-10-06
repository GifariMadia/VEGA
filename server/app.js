import express from 'express';
import uploadRoutes from './routes/uploadRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import config from './config/index.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use('/api/upload', uploadRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      success: true,
      service: 'vega-api',
      status: 'ok',
      port: config.port,
    });
  });

  app.use((err, _req, res, _next) => {
    console.error('Unhandled application error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}

export default createApp();
