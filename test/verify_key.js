import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { BASE_URL, MODEL_API_KEY, SPARK_MODEL } from '../src/config.js';

async function verify() {
  console.log('Verifying Meta Model API connection...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Model:    ${SPARK_MODEL}`);
  console.log(`Key set:  ${MODEL_API_KEY ? 'YES (length: ' + MODEL_API_KEY.length + ')' : 'NO'}`);

  if (!MODEL_API_KEY) {
    console.error('ERROR: MODEL_API_KEY is not set in .env');
    process.exit(1);
  }

  const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey: MODEL_API_KEY,
  });

  try {
    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: SPARK_MODEL,
      messages: [{ role: 'user', content: 'Respond with exactly: PONG' }],
      max_tokens: 10,
      temperature: 0.0,
    });

    const elapsed = Date.now() - startTime;
    const answer = response.choices?.[0]?.message?.content?.trim();
    console.log(`\n✓ SUCCESS! Connected to Meta Model API in ${elapsed}ms.`);
    console.log(`Model response: "${answer}"`);
    console.log(`Tokens used:    Prompt: ${response.usage?.prompt_tokens}, Completion: ${response.usage?.completion_tokens}`);
  } catch (err) {
    console.error(`\n✗ API call failed: ${err.message}`);
    if (err.status) console.error(`HTTP Status: ${err.status}`);
    if (err.error) console.error('Error details:', err.error);
    process.exit(1);
  }
}

verify();
