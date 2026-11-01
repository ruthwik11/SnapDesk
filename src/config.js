import dotenv from 'dotenv';
dotenv.config();

// Determine execution mode: 'mock' (default, free offline testing) or 'real' (Meta Model API)
const rawMode = (process.env.SNAPDESK_MODE || 'mock').toLowerCase().trim();
export const SNAPDESK_MODE = rawMode === 'real' ? 'real' : 'mock';

// Meta Model API Configuration
export const MODEL_API_KEY = process.env.MODEL_API_KEY || '';
export const BASE_URL = 'https://api.meta.ai/v1';

// Model IDs - Strictly Standard Mode only (never use Contributor IDs to protect user data;
// Muse Image is excluded under Geographic Use Policy)
export const SPARK_MODEL = process.env.SPARK_MODEL || 'muse-spark-1.3';
export const SAM_MODEL = process.env.SAM_MODEL || 'sam-3.1';
export const VOICE_MODEL = process.env.VOICE_MODEL || 'muse-voice-transcribe-1.0';

// Safety and Rate Limits
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const MAX_CALLS = parseInt(process.env.MAX_CALLS || '100', 10);

// Estimated Pricing (per Meta Model API developer docs)
export const PRICING = {
  SAM_IMAGE_CALL: 0.0025, // ~$2.50 per 1,000 images
  SAM_VIDEO_FRAME: 0.0002, // ~$0.20 per 1,000 video frames
  SPARK_INPUT_1M: 1.25,   // $1.25 per 1M input tokens
  SPARK_OUTPUT_1M: 4.25,  // $4.25 per 1M output tokens
  VOICE_PER_SECOND: 0.00005, // ~$0.18 per hour
};

// Restricted countries under Meta Geographic Use Policy
export const RESTRICTED_REGIONS = [
  'AF', 'BY', 'KH', 'CN', 'CU', 'ER', 'ET', 'HT',
  'IR', 'IQ', 'LY', 'MM', 'NI', 'KP', 'PK', 'RU',
  'SO', 'SY', 'VE', 'EH'
];

