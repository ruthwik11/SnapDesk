/**
 * SnapDesk Express Server
 * REST API & Static Asset Host for SnapDesk Autonomous Agent
 */

import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORT, SNAPDESK_MODE, SPARK_MODEL, SAM_MODEL, VOICE_MODEL, RESTRICTED_REGIONS } from './config.js';
import { caseStore } from './store.js';
import { processCaseAgent } from './agent.js';
import { meter } from './meter.js';
import { compilePolicyFromText } from './decision/spark_policy_compiler.js';
import { runEvaluation } from './eval.js';
import { transcribeAudioBuffer } from './voice/transcribe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({
  limits: {
    fileSize: 32 * 1024 * 1024, // 32MB max per upload
  },
  storage: multer.memoryStorage(),
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.resolve(__dirname, '../public')));

// Initialize in-memory store & disk policies
await caseStore.init();

// --- 1. POLICIES APIS ---

// List all policy templates
app.get('/api/policies', (req, res) => {
  res.json({
    success: true,
    policies: caseStore.getAllPolicies(),
  });
});

// Get a specific policy
app.get('/api/policies/:id', (req, res) => {
  const policy = caseStore.getPolicy(req.params.id);
  if (!policy) {
    return res.status(404).json({ success: false, error: 'Policy not found' });
  }
  res.json({ success: true, policy });
});

// Update or save a policy (supports live threshold editing for the Policy Flip demonstration)
app.put('/api/policies/:id', async (req, res) => {
  try {
    const updated = await caseStore.savePolicy({
      ...req.body,
      id: req.params.id,
    });
    res.json({ success: true, policy: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Policy Compiler (Converts plain-language policy prose into executable rules)
app.post('/api/policies/compile', async (req, res) => {
  try {
    const { text, name } = req.body;
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Policy text is required (minimum 10 characters).' });
    }
    const compiled = await compilePolicyFromText(text, name || 'Custom Policy');
    res.json({ success: true, policy: compiled });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 2. CASE INTAKE & PROCESSING ---

// Create & evaluate a new case
app.post(
  '/api/cases',
  upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'voice', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const policyId = req.body.policyId || 'parcel-damage';
      const policy = caseStore.getPolicy(policyId);
      if (!policy) {
        return res.status(400).json({ success: false, error: `Invalid policyId: ${policyId}` });
      }

      const mediaFile = req.files?.media?.[0];
      const voiceFile = req.files?.voice?.[0];

      // Handle media buffer (either uploaded file or base64 fallback)
      let mediaBuffer = mediaFile ? mediaFile.buffer : null;
      let mimeType = mediaFile ? mediaFile.mimetype : 'image/jpeg';
      let filename = mediaFile ? mediaFile.originalname : 'upload.jpg';

      if (!mediaBuffer && req.body.mediaBase64) {
        const matches = req.body.mediaBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          mediaBuffer = Buffer.from(matches[2], 'base64');
        } else {
          mediaBuffer = Buffer.from(req.body.mediaBase64, 'base64');
        }
      }

      if (!mediaBuffer) {
        return res.status(400).json({
          success: false,
          error: 'Visual evidence (photo or video) is required to file a claim.',
        });
      }

      const isVideo = mimeType.startsWith('video/') || filename.endsWith('.mp4') || filename.endsWith('.mov');

      // Process the case through the end-to-end Agent Pipeline
      const processedCase = await processCaseAgent({
        policy,
        mediaBuffer,
        mimeType,
        filename,
        audioBuffer: voiceFile ? voiceFile.buffer : null,
        audioFilename: voiceFile ? voiceFile.originalname : '',
        message: req.body.message || '',
        orderValue: parseFloat(req.body.orderValue || 0),
        isVideo,
        hint: req.body.hint || filename,
      });

      // Save case to store
      caseStore.saveCase(processedCase);

      res.status(201).json({
        success: true,
        case: processedCase,
      });
    } catch (err) {
      console.error('[Server] Case creation error:', err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

// List cases
app.get('/api/cases', (req, res) => {
  const cases = caseStore.getAllCases();
  res.json({
    success: true,
    total: cases.length,
    cases,
  });
});

// Get a single case
app.get('/api/cases/:id', (req, res) => {
  const foundCase = caseStore.getCase(req.params.id);
  if (!foundCase) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }
  res.json({ success: true, case: foundCase });
});

// Export evidence packet
app.get('/api/cases/:id/evidence', (req, res) => {
  const foundCase = caseStore.getCase(req.params.id);
  if (!foundCase) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }
  res.json({
    success: true,
    evidencePacket: foundCase.evidencePacket,
  });
});

// Re-evaluate an existing case under updated policy rules (Policy Flip live testing)
app.post('/api/cases/:id/rerun', async (req, res) => {
  try {
    const existing = caseStore.getCase(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const targetPolicyId = req.body.policyId || existing.policyId;
    let policy = caseStore.getPolicy(targetPolicyId);
    if (req.body.rules) {
      policy = {
        ...policy,
        rules: { ...policy.rules, ...req.body.rules },
      };
    }

    let mediaBuffer = null;
    let mimeType = 'image/jpeg';
    if (existing.mediaUrl && existing.mediaUrl.startsWith('data:')) {
      const parts = existing.mediaUrl.split(',');
      const meta = parts[0].match(/data:(.*?);base64/);
      mimeType = meta ? meta[1] : 'image/jpeg';
      mediaBuffer = Buffer.from(parts[1], 'base64');
    } else {
      mediaBuffer = Buffer.from(`sample_buffer_for_${existing.id}`);
    }

    const reevaluatedCase = await processCaseAgent({
      caseId: `rerun_${existing.id}_${Date.now().toString().slice(-4)}`,
      policy,
      mediaBuffer,
      mimeType,
      filename: 'reevaluation.jpg',
      message: existing.customerMessage,
      orderValue: req.body.orderValue !== undefined ? parseFloat(req.body.orderValue) : existing.orderValue,
      hint: existing.customerMessage,
      isRerun: true,
    });

    caseStore.saveCase(reevaluatedCase);

    res.json({
      success: true,
      case: reevaluatedCase,
      originalDecision: existing.finalDecision,
      newDecision: reevaluatedCase.finalDecision,
      flipped: existing.finalDecision !== reevaluatedCase.finalDecision,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 3. AUDIT, METER & BENCHMARK APIS ---

// Live API Usage meter & Cost estimate
app.get('/api/usage', (req, res) => {
  res.json({
    success: true,
    usage: meter.getUsageStats(),
  });
});

// Run benchmark evaluation suite
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

// Standalone voice transcription endpoint
app.post('/api/voice/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Audio file is required.' });
    }
    const result = await transcribeAudioBuffer(req.file.buffer, req.file.originalname);
    res.json({ success: true, transcription: result });
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
    version: '1.0.0',
    restrictedRegions: RESTRICTED_REGIONS,
    principles: [
      'Visual damage triage powered by SAM 3.1 & Muse Spark',
      'The policy is the only configuration',
      'The model never has the final say on money (deterministic guardrails override model)',
      'Forensic SVG evidence packet generated per claim',
    ],
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  SnapDesk Server running on http://localhost:${PORT}  `);
  console.log(`  Mode: ${SNAPDESK_MODE.toUpperCase()} | Spark: ${SPARK_MODEL} | SAM: ${SAM_MODEL}  `);
  console.log(`======================================================\n`);
});

export default app;
