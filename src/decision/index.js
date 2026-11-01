import { SNAPDESK_MODE, MODEL_API_KEY } from '../config.js';
import { decideWithSparkReal } from './spark_real.js';
import { decideWithSparkMock } from './spark_mock.js';

/**
 * Unified Decision Engine Entry Point
 */
export async function runDecisionEngine({
  policy,
  measurements,
  message = '',
  orderValue = 0,
  mediaBase64 = null,
  mimeType = 'image/jpeg',
}) {
  if (SNAPDESK_MODE === 'real' && MODEL_API_KEY) {
    try {
      return await decideWithSparkReal({
        policy,
        measurements,
        message,
        orderValue,
        mediaBase64,
        mimeType,
      });
    } catch (err) {
      console.error('[Decision Engine] Real Muse Spark call failed:', err.message);
      console.warn('[Decision Engine] Falling back to deterministic mock decision engine.');
      return await decideWithSparkMock({
        policy,
        measurements,
        message,
        orderValue,
      });
    }
  }

  return await decideWithSparkMock({
    policy,
    measurements,
    message,
    orderValue,
  });
}
