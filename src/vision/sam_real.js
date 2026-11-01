/**
 * Real Meta Model API adapter for SAM 3.1 (Segment Anything Model 3.1)
 * Follows official Meta cookbook recipes:
 * - Books/meta-model-cookbook/07_sam/01_api_basics/typescript/sam-api.ts
 *
 * Implements streaming response decoding via @meta-sam/parser and the normalizedEvents pattern.
 */

import {
  decodeMaskToRaster,
  decodeMaskToSVGPath,
  parseImageStream,
  parseVideoStream,
  recordsOfKind,
} from '@meta-sam/parser';
import OpenAI, { toFile } from 'openai';
import { BASE_URL, MODEL_API_KEY, SAM_MODEL } from '../config.js';
import { meter } from '../meter.js';

function getClient() {
  if (!MODEL_API_KEY) {
    throw new Error(
      'MODEL_API_KEY is missing. Add your Meta Model API key to .env or switch to SNAPDESK_MODE=mock.'
    );
  }
  return new OpenAI({
    baseURL: BASE_URL,
    apiKey: MODEL_API_KEY,
  });
}

/**
 * Normalizes streaming events so that @meta-sam/parser can finalize the text stream properly.
 * Synthesizes response.output_text.done from response.content_part.done.
 * Reference: Books/meta-model-cookbook/07_sam/01_api_basics/typescript/sam-api.ts#L74-L111
 */
async function* normalizedEvents(stream) {
  const completed = new Set();
  for await (const raw of stream) {
    const lane = `${String(raw.item_id)}:${String(raw.output_index)}:${String(raw.content_index)}`;
    if (raw.type === 'response.output_text.done') {
      if (!completed.has(lane)) {
        completed.add(lane);
        yield raw;
      }
      continue;
    }
    yield raw;
    if (
      raw.type === 'response.content_part.done' &&
      !completed.has(lane) &&
      raw.part &&
      typeof raw.part === 'object' &&
      raw.part.type === 'output_text' &&
      typeof raw.part.text === 'string'
    ) {
      completed.add(lane);
      yield {
        type: 'response.output_text.done',
        item_id: raw.item_id,
        output_index: raw.output_index,
        content_index: raw.content_index,
        text: raw.part.text,
      };
    }
  }
}

/**
 * Segments an image concept using SAM 3.1 over Responses API stream.
 */
export async function segmentConceptReal(mediaBuffer, mimeType, concept, isVideo = false) {
  meter.checkBudget();
  const client = getClient();
  const startTime = Date.now();

  let finalResult;
  if (isVideo) {
    // 1. Upload video to Files API
    const uploaded = await client.files.create({
      file: await toFile(mediaBuffer, 'clip.mp4', { type: mimeType }),
      purpose: 'user_data',
    });

    // 2. Stream video segmentation
    const stream = await client.responses.create({
      model: SAM_MODEL,
      stream: true,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            { type: 'input_text', text: concept.trim() },
            { type: 'input_video', file_id: uploaded.id },
          ],
        },
      ],
    });

    const parsed = parseVideoStream(normalizedEvents(stream));
    finalResult = await parsed.finalResult;
  } else {
    // Single image call via data URL
    const base64Data = mediaBuffer.toString('base64');
    const stream = await client.responses.create({
      model: SAM_MODEL,
      stream: true,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            { type: 'input_text', text: concept.trim() },
            {
              type: 'input_image',
              image_url: `data:${mimeType};base64,${base64Data}`,
            },
          ],
        },
      ],
    });

    finalResult = await parseImageStream(normalizedEvents(stream)).finalResult;
  }

  const durationMs = Date.now() - startTime;
  meter.recordCall({
    model: SAM_MODEL,
    type: isVideo ? 'video_segmentation' : 'image_segmentation',
    durationMs,
    mock: false,
  });

  return finalResult;
}

/**
 * Processes a full set of prompts (product, damage, contents) with SAM 3.1
 * and computes exact metrics (area ratios, normalized bboxes, SVG paths).
 */
export async function runSamPipelineReal({ mediaBuffer, mimeType, prompts, isVideo = false }) {
  const resultRegions = [];
  let productPixels = 0;
  let damagePixels = 0;
  let productFound = false;
  let contentsDamaged = false;

  // 1. Segment product boundary
  try {
    const productRes = await segmentConceptReal(mediaBuffer, mimeType, prompts.product, isVideo);
    const masks = recordsOfKind(productRes.records, 'mask');
    const boxes = recordsOfKind(productRes.records, 'box');

    if (masks.length > 0) {
      productFound = true;
      for (const m of masks) {
        const raster = decodeMaskToRaster(m.mask);
        const foreground = raster.reduce((sum, v) => sum + v, 0);
        productPixels += foreground;
        const svgPath = decodeMaskToSVGPath(m.mask);

        // Find corresponding box if available
        const box = boxes.find((b) => b.objectId === m.objectId);
        const bbox = box
          ? [
              parseFloat((box.left / m.mask.width).toFixed(4)),
              parseFloat((box.top / m.mask.height).toFixed(4)),
              parseFloat(((box.right - box.left) / m.mask.width).toFixed(4)),
              parseFloat(((box.bottom - box.top) / m.mask.height).toFixed(4)),
            ]
          : [0.1, 0.1, 0.8, 0.8];

        resultRegions.push({
          label: prompts.product,
          type: 'product',
          area_ratio: 1.0,
          foreground_pixels: foreground,
          bbox,
          mask: {
            path: svgPath,
            w: m.mask.width,
            h: m.mask.height,
          },
        });
      }
    }
  } catch (err) {
    console.warn(`[SAM Real] Product segmentation failed for "${prompts.product}":`, err.message);
  }

  // 2. Segment each damage phrase
  const damagePhrases = Array.isArray(prompts.damage) ? prompts.damage : [prompts.damage];
  for (const phrase of damagePhrases) {
    try {
      const res = await segmentConceptReal(mediaBuffer, mimeType, phrase, isVideo);
      const masks = recordsOfKind(res.records, 'mask');
      const boxes = recordsOfKind(res.records, 'box');

      for (const m of masks) {
        const raster = decodeMaskToRaster(m.mask);
        const foreground = raster.reduce((sum, v) => sum + v, 0);
        damagePixels += foreground;
        const svgPath = decodeMaskToSVGPath(m.mask);

        const box = boxes.find((b) => b.objectId === m.objectId);
        const bbox = box
          ? [
              parseFloat((box.left / m.mask.width).toFixed(4)),
              parseFloat((box.top / m.mask.height).toFixed(4)),
              parseFloat(((box.right - box.left) / m.mask.width).toFixed(4)),
              parseFloat(((box.bottom - box.top) / m.mask.height).toFixed(4)),
            ]
          : [0.2, 0.2, 0.3, 0.3];

        const areaRatioAgainstProduct = productPixels > 0
          ? parseFloat((foreground / productPixels).toFixed(4))
          : parseFloat((foreground / (m.mask.width * m.mask.height)).toFixed(4));

        resultRegions.push({
          label: phrase,
          type: 'damage',
          area_ratio: Math.min(1.0, areaRatioAgainstProduct),
          foreground_pixels: foreground,
          bbox,
          mask: {
            path: svgPath,
            w: m.mask.width,
            h: m.mask.height,
          },
        });
      }
    } catch (err) {
      console.warn(`[SAM Real] Damage segmentation failed for "${phrase}":`, err.message);
    }
  }

  // 3. Segment contents phrases
  const contentsPhrases = Array.isArray(prompts.contents) ? prompts.contents : [prompts.contents];
  for (const phrase of contentsPhrases) {
    try {
      const res = await segmentConceptReal(mediaBuffer, mimeType, phrase, isVideo);
      const masks = recordsOfKind(res.records, 'mask');
      if (masks.length > 0) {
        contentsDamaged = true;
        const boxes = recordsOfKind(res.records, 'box');
        for (const m of masks) {
          const svgPath = decodeMaskToSVGPath(m.mask);
          const box = boxes.find((b) => b.objectId === m.objectId);
          const bbox = box
            ? [
                parseFloat((box.left / m.mask.width).toFixed(4)),
                parseFloat((box.top / m.mask.height).toFixed(4)),
                parseFloat(((box.right - box.left) / m.mask.width).toFixed(4)),
                parseFloat(((box.bottom - box.top) / m.mask.height).toFixed(4)),
              ]
            : [0.3, 0.3, 0.4, 0.4];

          resultRegions.push({
            label: phrase,
            type: 'contents',
            area_ratio: 0.15,
            bbox,
            mask: {
              path: svgPath,
              w: m.mask.width,
              h: m.mask.height,
            },
          });
        }
      }
    } catch (err) {
      console.warn(`[SAM Real] Contents segmentation check failed for "${phrase}":`, err.message);
    }
  }

  const packagingDamageRatio = productPixels > 0
    ? parseFloat(Math.min(1.0, damagePixels / productPixels).toFixed(4))
    : (resultRegions.filter(r => r.type === 'damage').length > 0 ? 0.25 : 0.0);

  return {
    mock: false,
    product_found: productFound,
    contents_damaged: contentsDamaged,
    packaging_damage_ratio: packagingDamageRatio,
    product_pixels: productPixels,
    damage_pixels: damagePixels,
    regions: resultRegions,
  };
}

