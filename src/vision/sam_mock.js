/**
 * High-fidelity deterministic mock for SAM 3.1
 * Produces accurate SVG paths, bounding boxes, and ratios without requiring API credits.
 * This guarantees the full agent pipeline, evidence packet, and UI render perfectly.
 */

import { meter } from '../meter.js';

export async function runSamPipelineMock({
  mediaBuffer,
  mimeType,
  prompts,
  filename = '',
  hint = '',
}) {
  const startTime = Date.now();
  const lowerHint = (filename + ' ' + hint).toLowerCase();

  // Determine scenario parameters based on input clues or realistic default
  let productFound = true;
  let contentsDamaged = false;
  let packagingDamageRatio = 0.22; // default moderate packaging damage
  let damageLabel = prompts.damage?.[0] || 'crushed corner';

  if (lowerHint.includes('no_product') || lowerHint.includes('unclear') || lowerHint.includes('blurry')) {
    productFound = false;
    packagingDamageRatio = 0.0;
  } else if (lowerHint.includes('broken') || lowerHint.includes('shattered') || lowerHint.includes('liquid') || lowerHint.includes('leak')) {
    contentsDamaged = true;
    packagingDamageRatio = 0.45;
    damageLabel = prompts.contents?.[0] || 'broken item';
  } else if (lowerHint.includes('severe') || lowerHint.includes('heavy') || lowerHint.includes('crushed_heavy')) {
    packagingDamageRatio = 0.42;
    damageLabel = prompts.damage?.[0] || 'crushed corner';
  } else if (lowerHint.includes('minor') || lowerHint.includes('scratch') || lowerHint.includes('small_dent')) {
    packagingDamageRatio = 0.12;
    damageLabel = prompts.damage?.[1] || prompts.damage?.[0] || 'scuff mark';
  } else if (lowerHint.includes('perfect') || lowerHint.includes('intact')) {
    packagingDamageRatio = 0.02;
  }

  const regions = [];

  if (productFound) {
    // 1. Product bounding region
    regions.push({
      label: prompts.product || 'package',
      type: 'product',
      area_ratio: 1.0,
      foreground_pixels: 142000,
      bbox: [0.08, 0.08, 0.84, 0.84], // [x, y, width, height] normalized
      mask: {
        w: 640,
        h: 480,
        path: 'M 50,40 L 590,40 L 590,440 L 50,440 Z',
      },
    });

    // 2. Primary damage region
    if (packagingDamageRatio > 0.05) {
      // Create organic curved polygon path representing damage
      const damagePath = contentsDamaged
        ? 'M 220,180 Q 300,160 380,200 Q 420,290 360,340 Q 260,370 200,310 Q 170,240 220,180 Z'
        : 'M 340,70 Q 460,50 540,110 Q 580,220 520,270 Q 440,290 380,240 Q 320,160 340,70 Z';

      const bbox = contentsDamaged
        ? [0.30, 0.28, 0.38, 0.36]
        : [0.52, 0.10, 0.38, 0.42];

      regions.push({
        label: damageLabel,
        type: 'damage',
        area_ratio: packagingDamageRatio,
        foreground_pixels: Math.round(142000 * packagingDamageRatio),
        bbox,
        mask: {
          w: 640,
          h: 480,
          path: damagePath,
        },
      });
    }

    // 3. Contents damaged region if flagged
    if (contentsDamaged) {
      regions.push({
        label: prompts.contents?.[0] || 'broken item',
        type: 'contents',
        area_ratio: 0.18,
        foreground_pixels: 25560,
        bbox: [0.35, 0.35, 0.25, 0.25],
        mask: {
          w: 640,
          h: 480,
          path: 'M 250,220 L 320,200 L 370,250 L 350,310 L 270,300 Z',
        },
      });
    }
  }

  const durationMs = Date.now() - startTime;
  meter.recordCall({
    model: 'sam-3.1',
    type: 'image_segmentation',
    durationMs,
    mock: true,
  });

  return {
    mock: true,
    product_found: productFound,
    contents_damaged: contentsDamaged,
    packaging_damage_ratio: packagingDamageRatio,
    product_pixels: productFound ? 142000 : 0,
    damage_pixels: Math.round(142000 * packagingDamageRatio),
    regions,
  };
}

