/**
 * SnapDesk Customer Intake & Case Processing Routes
 *
 * Implements:
 * - Section 1: Customer Intake with NO-PERSISTENCE-BEFORE-SUBMIT rule
 * - Section 2: Vision Workspace & "Damage Report - {Customer Name}" generation
 * - Section 3: 4-stage Decision Engine & "Model Decision Formulated" outcome
 */

import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { tenantStore } from '../models/tenant_store.js';
import { processVisionPipeline } from '../services/vision_service.js';
import { processDecisionPipeline } from '../services/decision_service.js';
import { transcribeAudioBuffer } from '../voice/transcribe.js';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 32 * 1024 * 1024 }, // 32MB cap
  storage: multer.memoryStorage(),
});

/**
 * SECTION 1: RAISE A TICKET (SUBMIT TICKET)
 * The ONLY persistence trigger. No records are created prior to pressing Submit Ticket.
 */
router.post(
  '/',
  upload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'voice', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        customerName,
        customerPhone,
        postalCode,
        businessId,
        productCost,
        writtenComplaint,
        customerId,
      } = req.body;

      // 1. Mandatory Validations
      if (!customerName || !customerPhone || !postalCode) {
        return res.status(400).json({
          success: false,
          error: 'Full name, contact number, and postal/PIN code are required.',
        });
      }

      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Select your product Provider is mandatory.',
        });
      }

      // Revalidate that selected business exists and is active
      const business = tenantStore.getBusiness(businessId);
      if (!business || !business.active) {
        return res.status(400).json({
          success: false,
          error: 'The selected product provider is not an active registered business.',
        });
      }

      if (!writtenComplaint || writtenComplaint.trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Please explain your concern in the written complaint field.',
        });
      }

      // 2. Validate Media Files (Photos/Videos)
      const uploadedFiles = req.files?.media || [];
      const mediaAssets = [];

      // Accept base64 fallback from client-side state if passed in JSON body
      if (uploadedFiles.length === 0 && req.body.stagedMedia) {
        try {
          const staged = JSON.parse(req.body.stagedMedia);
          if (Array.isArray(staged)) {
            staged.forEach((item, idx) => {
              const hash = crypto.createHash('sha256').update(item.base64 || '').digest('hex');
              mediaAssets.push({
                id: `asset_${Date.now()}_${idx}`,
                originalFilename: item.name || `evidence_${idx}.jpg`,
                mimeType: item.mimeType || 'image/jpeg',
                sizeBytes: item.size || 50000,
                sha256Digest: hash,
                mediaUrl: item.base64,
                isVideo: Boolean(item.isVideo || item.mimeType?.startsWith('video/')),
              });
            });
          }
        } catch (e) {
          console.warn('Failed to parse staged media:', e.message);
        }
      } else {
        uploadedFiles.forEach((file, idx) => {
          const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
          const isVideo = file.mimetype.startsWith('video/') || file.originalname.endsWith('.mp4');
          mediaAssets.push({
            id: `asset_${Date.now()}_${idx}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            sha256Digest: hash,
            mediaUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            isVideo,
          });
        });
      }

      if (mediaAssets.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one photo or video of the parcel/product is required.',
        });
      }

      // 3. Optional Voice Note (Audio only validation)
      let voiceTranscript = null;
      const voiceFile = req.files?.voice?.[0];
      if (voiceFile) {
        if (!voiceFile.mimetype.startsWith('audio/') && !voiceFile.originalname.match(/\.(wav|mp3|m4a|ogg)$/i)) {
          return res.status(400).json({
            success: false,
            error: 'Voice note field accepts audio files only.',
          });
        }
        const transResult = await transcribeAudioBuffer(voiceFile.buffer, voiceFile.originalname);
        voiceTranscript = transResult.transcript;
      } else if (req.body.simulatedVoiceTranscript) {
        voiceTranscript = req.body.simulatedVoiceTranscript;
      }

      // 4. Resolve Active Policy & Thresholds for the selected Business
      const activePolicy = tenantStore.getActivePolicy(businessId);
      const activeThreshold = tenantStore.getActiveThreshold(businessId);

      // 5. Create Durable Case Record (First server persistence point!)
      const newCase = tenantStore.createCase({
        businessId,
        customerId: customerId || 'usr_anonymous_customer',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        postalCode: postalCode.trim(),
        productCostReported: productCost ? parseFloat(productCost) : null,
        productCostVerified: null, // Clearly marked unverified unless matched with order
        writtenComplaint: writtenComplaint.trim(),
        voiceTranscript,
        mediaAssets,
        status: 'submitted',
        outcome: 'pending',
        outcomeStatus: 'more_info_required',
        handlingBadge: 'ai_handled',
        policyVersionId: activePolicy?.versionId,
        thresholdVersionId: activeThreshold?.versionId,
      });

      res.status(201).json({
        success: true,
        message: 'Ticket successfully submitted.',
        caseId: newCase.id,
        caseNumber: newCase.caseNumber,
        businessName: business.name,
      });
    } catch (err) {
      console.error('[Case Intake Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * Get Case by ID (Customer safe or tenant view)
 */
router.get('/:id', (req, res) => {
  const caseObj = tenantStore.getCase(req.params.id);
  if (!caseObj) {
    return res.status(404).json({ success: false, error: 'Ticket not found.' });
  }

  const business = tenantStore.getBusiness(caseObj.businessId);
  const damageReport = tenantStore.getDamageReportByCase(caseObj.id);

  res.json({
    success: true,
    case: {
      ...caseObj,
      businessName: business?.name || 'Business Partner',
      hasDamageReport: Boolean(damageReport),
    },
  });
});

/**
 * SECTION 2: TRIGGER VISION DAMAGE ANALYSIS & GENERATE DAMAGE REPORT
 */
router.post('/:id/analyze-vision', async (req, res) => {
  try {
    const caseObj = tenantStore.getCase(req.params.id);
    if (!caseObj) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    // Execute SAM 3.1 analysis and generate "Damage Report - {Customer Name}"
    const damageReport = await processVisionPipeline({
      caseId: caseObj.id,
      customerName: caseObj.customerName,
      businessId: caseObj.businessId,
      mediaAssets: caseObj.mediaAssets,
      complaintText: caseObj.writtenComplaint,
    });

    tenantStore.updateCase(caseObj.id, {
      status: 'analyzing',
      damageReportId: damageReport.reportId,
      measurements: {
        product_found: damageReport.productFound,
        contents_damaged: damageReport.contentsDamaged,
        packaging_damage_ratio: damageReport.damageRatio,
        damage_ratio_formatted: damageReport.damageRatioFormatted,
        regions: damageReport.regions,
      },
    });

    res.json({
      success: true,
      damageReport,
    });
  } catch (err) {
    console.error('[Vision Analysis Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * SECTION 2: RETRIEVE CANONICAL DAMAGE REPORT
 */
router.get('/:id/damage-report', (req, res) => {
  const damageReport = tenantStore.getDamageReportByCase(req.params.id);
  if (!damageReport) {
    return res.status(404).json({ success: false, error: 'Damage Report has not been generated for this case.' });
  }
  res.json({ success: true, damageReport });
});

/**
 * SECTION 3: TRIGGER DECISION ENGINE & 4-STAGE PIPELINE
 */
router.post('/:id/decide', async (req, res) => {
  try {
    const caseObj = tenantStore.getCase(req.params.id);
    if (!caseObj) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    let damageReport = tenantStore.getDamageReportByCase(caseObj.id);
    if (!damageReport) {
      // Auto-run vision if not completed yet
      damageReport = await processVisionPipeline({
        caseId: caseObj.id,
        customerName: caseObj.customerName,
        businessId: caseObj.businessId,
        mediaAssets: caseObj.mediaAssets,
        complaintText: caseObj.writtenComplaint,
      });
    }

    const decisionResult = await processDecisionPipeline({
      caseObj,
      damageReport,
    });

    res.json({
      success: true,
      decision: decisionResult,
    });
  } catch (err) {
    console.error('[Decision Engine Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

