import { Router } from 'express';
import { ProxyHandler } from './proxy-handler';

const router = Router();
const proxyHandler = new ProxyHandler();

// Health check endpoint
router.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Shopify app proxy routes
// These routes will be configured in Shopify admin as app proxy
// Format: /apps/{app-handle}/proxy/*
router.use('/proxy', (req, res, next) => {
  // Verify Shopify proxy request signature if needed
  if (!proxyHandler.validateProxySignature()) {
    res.status(401).json({
      success: false,
      error: 'Invalid proxy signature'
    });
    return;
  }
  next();
});

// User landing endpoint - main proxy endpoint for personalized content
router.get('/proxy/user-landing', async (req, res) => {
  await proxyHandler.handleUserLanding(req, res);
});

// Additional proxy endpoints can be added here
router.get('/proxy/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Proxy endpoint is working',
    timestamp: new Date().toISOString()
  });
});

export { router };
