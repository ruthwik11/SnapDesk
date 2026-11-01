/**
 * SnapDesk Express Server
 * Cohesive Multi-Tenant Customer Support Platform Powered by Meta AI
 */

import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORT, SNAPDESK_MODE, SPARK_MODEL, SAM_MODEL, VOICE_MODEL, RESTRICTED_REGIONS } from './config.js';
import { tenantStore } from './models/tenant_store.js';
import { meter } from './meter.js';
import { runEvaluation } from './eval.js';

import authRoutes from './routes/auth_routes.js';
import businessRoutes from './routes/business_routes.js';
import caseRoutes from './routes/case_routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files from public/
app.use(express.static(path.resolve(__dirname, '../public')));

// Initialize Multi-Tenant Store
await tenantStore.init();

// --- MOUNT ROUTERS ---
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/cases', caseRoutes);

// --- PRESERVED OPS & ACCURACY APIS ---
app.get('/api/usage', (req, res) => {
  res.json({
    success: true,
    usage: meter.getUsageStats(),
  });
});

app.post('/api/eval', async (req, res) => {
  try {
    const metrics = await runEvaluation();
    res.json({
      success: true,
      metrics,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// System Status & Meta Model Registry
app.get('/api/system', (req, res) => {
  res.json({
    status: 'online',
    mode: SNAPDESK_MODE,
    models: {
      decision: SPARK_MODEL,
      vision: SAM_MODEL,
      voice: VOICE_MODEL,
    },
    version: '2.0.0-multi-tenant',
    restrictedRegions: RESTRICTED_REGIONS,
    principles: [
      'Visual damage triage powered by SAM 3.1 & Muse Spark',
      'The policy is the only configuration (strict tenant-scoped policies)',
      'The model never has the final say on money (deterministic guardrails override model)',
      'Forensic SVG evidence packet generated per claim',
      'Multi-tenant separation: Business accounts vs Customer accounts',
    ],
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`  SnapDesk Multi-Tenant Server running on http://localhost:${PORT}  `);
  console.log(`  Mode: ${SNAPDESK_MODE.toUpperCase()} | Spark: ${SPARK_MODEL} | SAM: ${SAM_MODEL}  `);
  console.log(`================================================================\n`);
});

export default app;
