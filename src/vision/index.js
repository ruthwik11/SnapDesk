import { SNAPDESK_MODE, MODEL_API_KEY } from '../config.js';
import { visionCache } from '../cache.js';
import { runSamPipelineReal } from './sam_real.js';
import { runSamPipelineMock } from './sam_mock.js';

/**
 * Unified Vision Segmentation Entry Point
 * Implements transparent caching, mode switching, and measurement extraction.
 */
export async function segmentDamage({
  mediaBuffer,
  mimeType = 'image/jpeg',
  prompts,
  filename = '',
  hint = '',
  isVideo = false,
}) {
  const mediaHash = visionCache.hashMedia(mediaBuffer);
  const cachePromptKey = `${prompts.product}__${(prompts.damage || []).join('_')}`;

  // Check cache to conserve credits & accelerate repeated runs (e.g. policy flip tests!)
  const cached = visionCache.get(mediaHash, cachePromptKey);
  if (cached) {
    return {
      ...cached.result,
      cached: true,
      mediaHash,
    };
  }

  let measurements;

  if (SNAPDESK_MODE === 'real' && MODEL_API_KEY) {
    try {
      measurements = await runSamPipelineReal({
        mediaBuffer,
        mimeType,
        prompts,
        isVideo,
      });
    } catch (err) {
      console.error('[Vision] SAM Real pipeline encountered error:', err.message);
      console.warn('[Vision] Falling back to high-fidelity mock adapter.');
      measurements = await runSamPipelineMock({
        mediaBuffer,
        mimeType,
        prompts,
        filename,
        hint: hint + ' (fallback)',
      });
    }
  } else {
    measurements = await runSamPipelineMock({
      mediaBuffer,
      mimeType,
      prompts,
      filename,
      hint,
    });
  }

  // Store in cache for future instant lookups
  visionCache.set(mediaHash, cachePromptKey, measurements);

  return {
    ...measurements,
    cached: false,
    mediaHash,
  };
}

