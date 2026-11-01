import dotenv from 'dotenv';
dotenv.config();

import { readFile } from 'node:fs/promises';
import { segmentConceptReal } from '../src/vision/sam_real.js';

async function testSam() {
  console.log('Reading ducks.jpg...');
  const buffer = await readFile('Books/meta-model-cookbook/07_sam/01_api_basics/assets/ducks.jpg');
  console.log(`Image size: ${buffer.length} bytes`);
  console.log('Sending request to live SAM 3.1 (sam-3.1)...');
  const res = await segmentConceptReal(buffer, 'image/jpeg', 'duck', false);
  console.log('SAM 3.1 Status:   ', res.outcome.status);
  console.log('Records returned: ', res.records.length);
  const masks = res.records.filter((r) => r.kind === 'mask');
  const boxes = res.records.filter((r) => r.kind === 'box');
  console.log(`Detected: ${masks.length} masks, ${boxes.length} bounding boxes.`);
}

testSam().catch((err) => {
  console.error('SAM live test error:', err);
  process.exit(1);
});
