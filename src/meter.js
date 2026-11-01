import { MAX_CALLS, PRICING, SNAPDESK_MODE } from './config.js';

class UsageMeter {
  constructor() {
    this.totalCalls = 0;
    this.mockCalls = 0;
    this.callsByModel = {
      'sam-3.1': 0,
      'muse-spark-1.3': 0,
      'muse-voice-transcribe-1.0': 0,
    };
    this.tokens = {
      input: 0,
      output: 0,
      total: 0,
    };
    this.estimatedCostUSD = 0.0;
    this.maxCalls = MAX_CALLS;
    this.recentCalls = [];
  }

  /**
   * Enforces the hard cap budget limit in real mode.
   * Throws an error if the budget limit is reached.
   */
  checkBudget() {
    if (SNAPDESK_MODE === 'real' && this.totalCalls >= this.maxCalls) {
      throw new Error(
        `[SnapDesk Budget Guard] Hard call limit reached (${this.totalCalls}/${this.maxCalls}). Protects credits from overruns.`
      );
    }
  }

  /**
   * Records an API call or simulated call.
   */
  recordCall({
    model = 'sam-3.1',
    type = 'image_segmentation',
    inputTokens = 0,
    outputTokens = 0,
    framesCount = 0,
    secondsAudio = 0,
    durationMs = 0,
    mock = false,
  }) {
    let callCost = 0.0;

    if (mock) {
      this.mockCalls += 1;
    } else {
      this.totalCalls += 1;
      this.callsByModel[model] = (this.callsByModel[model] || 0) + 1;

      // Calculate cost according to model pricing
      if (model.includes('sam')) {
        if (framesCount > 0) {
          callCost = framesCount * PRICING.SAM_VIDEO_FRAME;
        } else {
          callCost = PRICING.SAM_IMAGE_CALL;
        }
      } else if (model.includes('spark')) {
        const inputCost = (inputTokens / 1_000_000) * PRICING.SPARK_INPUT_1M;
        const outputCost = (outputTokens / 1_000_000) * PRICING.SPARK_OUTPUT_1M;
        callCost = inputCost + outputCost;
        this.tokens.input += inputTokens;
        this.tokens.output += outputTokens;
        this.tokens.total += inputTokens + outputTokens;
      } else if (model.includes('voice')) {
        callCost = secondsAudio * PRICING.VOICE_PER_SECOND;
      }

      this.estimatedCostUSD += callCost;
    }

    const logEntry = {
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      model,
      type,
      durationMs,
      estimatedCostUSD: parseFloat(callCost.toFixed(5)),
      mock,
    };

    this.recentCalls.unshift(logEntry);
    if (this.recentCalls.length > 50) {
      this.recentCalls.pop();
    }

    return logEntry;
  }

  /**
   * Returns formatted statistics for /api/usage.
   */
  getUsageStats() {
    return {
      mode: SNAPDESK_MODE,
      totalRealCalls: this.totalCalls,
      totalMockCalls: this.mockCalls,
      maxCallsAllowed: this.maxCalls,
      remainingCalls: Math.max(0, this.maxCalls - this.totalCalls),
      budgetExceeded: this.totalCalls >= this.maxCalls,
      callsByModel: this.callsByModel,
      tokenUsage: this.tokens,
      estimatedCostUSD: parseFloat(this.estimatedCostUSD.toFixed(4)),
      recentCalls: this.recentCalls.slice(0, 15),
    };
  }

  reset() {
    this.totalCalls = 0;
    this.mockCalls = 0;
    this.callsByModel = {
      'sam-3.1': 0,
      'muse-spark-1.3': 0,
      'muse-voice-transcribe-1.0': 0,
    };
    this.tokens = { input: 0, output: 0, total: 0 };
    this.estimatedCostUSD = 0.0;
    this.recentCalls = [];
  }
}

export const meter = new UsageMeter();
