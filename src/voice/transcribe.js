/**
 * Muse Voice Transcribe Adapter (muse-voice-transcribe-1.0)
 * Follows Meta cookbook:
 * Books/meta-model-cookbook/06_muse_voice/01_voice_api_fundamentals/transcribe_file.py
 * Books/meta-model-cookbook/06_muse_voice/01_voice_api_fundamentals/utils.py
 */

import { BASE_URL, MODEL_API_KEY, SNAPDESK_MODE, VOICE_MODEL } from '../config.js';
import { meter } from '../meter.js';

export async function transcribeAudioBuffer(audioBuffer, filename = 'voice_note.wav') {
  if (SNAPDESK_MODE === 'real' && MODEL_API_KEY) {
    try {
      meter.checkBudget();
      const startTime = Date.now();

      const formData = new FormData();
      const requestPayload = {
        mode: 'PUSH_TO_TALK',
        model: VOICE_MODEL,
        audioEncoding: 'WAV',
      };

      formData.append(
        'request',
        new Blob([JSON.stringify(requestPayload)], { type: 'application/json' })
      );
      formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), filename);

      const response = await fetch(`${BASE_URL}/asr/transcribe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MODEL_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ASR API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      const durationMs = Date.now() - startTime;
      const audioSeconds = (result.audioDurationMs || 3000) / 1000;

      meter.recordCall({
        model: VOICE_MODEL,
        type: 'voice_transcription',
        secondsAudio: audioSeconds,
        durationMs,
        mock: false,
      });

      return {
        transcript: result.transcript || '',
        turns: result.turns || [],
        durationSeconds: audioSeconds,
        mock: false,
      };
    } catch (err) {
      console.warn('[Muse Voice] Real transcription failed, falling back to mock:', err.message);
    }
  }

  // Deterministic Mock Voice Transcription
  const mockDurationSeconds = 4.2;
  meter.recordCall({
    model: 'muse-voice-transcribe-1.0',
    type: 'voice_transcription',
    secondsAudio: mockDurationSeconds,
    durationMs: 120,
    mock: true,
  });

  return {
    transcript:
      'Hi, I received my delivery today but the shipping box was heavily crushed on one side, and when I opened it, the inner item was scratched and dented.',
    turns: [
      {
        speaker: 'Customer',
        startMs: 0,
        transcript:
          'Hi, I received my delivery today but the shipping box was heavily crushed on one side, and when I opened it, the inner item was scratched and dented.',
      },
    ],
    durationSeconds: mockDurationSeconds,
    mock: true,
  };
}
