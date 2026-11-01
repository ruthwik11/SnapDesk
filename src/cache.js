import crypto from 'node:crypto';

class VisionCache {
  constructor() {
    // Cache for SAM segmentation results: key is `${imageHash}:${concept}`
    this.segmentCache = new Map();
    // Cache of all ingested media hashes: key is `hash`, value is caseId
    this.mediaRegistry = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generates a hex SHA-256 digest of media buffer or string.
   */
  hashMedia(buffer) {
    if (typeof buffer === 'string') {
      return crypto.createHash('sha256').update(buffer).digest('hex');
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Checks if this visual media has been submitted before.
   */
  isDuplicate(hash) {
    return this.mediaRegistry.has(hash);
  }

  /**
   * Registers a media hash associated with a case ID.
   */
  registerMedia(hash, caseId) {
    this.mediaRegistry.set(hash, {
      caseId,
      firstSeen: new Date().toISOString(),
    });
  }

  /**
   * Gets cached segmentation result for a hash + concept prompt.
   */
  get(hash, concept) {
    const key = `${hash}:${concept.trim().toLowerCase()}`;
    if (this.segmentCache.has(key)) {
      this.hits += 1;
      return this.segmentCache.get(key);
    }
    this.misses += 1;
    return null;
  }

  /**
   * Stores segmentation result in cache.
   */
  set(hash, concept, result) {
    const key = `${hash}:${concept.trim().toLowerCase()}`;
    this.segmentCache.set(key, {
      result,
      cachedAt: new Date().toISOString(),
    });
  }

  getStats() {
    return {
      cachedEntries: this.segmentCache.size,
      registeredMediaCount: this.mediaRegistry.size,
      cacheHits: this.hits,
      cacheMisses: this.misses,
    };
  }

  clear() {
    this.segmentCache.clear();
    this.mediaRegistry.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const visionCache = new VisionCache();

