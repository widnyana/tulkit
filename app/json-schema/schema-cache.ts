import LZString from "lz-string";
import type { JSONSchema } from "./types";

interface CachedSchema {
  url: string;
  content: string; // JSON string
  compressed: boolean; // compression flag
  timestamp: number; // for TTL
  size: number; // original size
  schemaVersion?: string; // from $id or $schema
}

export interface CacheStats {
  count: number;
  totalSize: number;
  oldestTimestamp: number;
  compressionRatio: number;
}

const CONFIG = {
  SIZE_THRESHOLD: 100 * 1024, // 100KB - compress above this
  MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_PREFIX: "tulkit:jschcache:",
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB total cache limit
};

export class SchemaCache {
  private readonly CACHE_PREFIX = CONFIG.CACHE_PREFIX;
  private readonly SIZE_THRESHOLD = CONFIG.SIZE_THRESHOLD;
  private readonly MAX_AGE_MS = CONFIG.MAX_AGE_MS;
  private readonly MAX_TOTAL_SIZE = CONFIG.MAX_TOTAL_SIZE;

  /**
   * Get cached schema if exists and not stale
   */
  get(url: string): JSONSchema | null {
    try {
      const key = this.getCacheKey(url);
      const item = localStorage.getItem(key);

      if (!item) return null;

      const cached: CachedSchema = JSON.parse(item);

      // Check if stale
      if (this.isStaleEntry(cached)) {
        this.remove(url);
        return null;
      }

      // Decompress if needed
      const jsonStr = cached.compressed
        ? this.decompress(cached.content)
        : cached.content;

      return JSON.parse(jsonStr) as JSONSchema;
    } catch (error) {
      console.warn(`Failed to get cached schema for ${url}:`, error);
      return null;
    }
  }

  /**
   * Store schema in cache with hybrid compression
   */
  set(url: string, schema: JSONSchema): boolean {
    try {
      const jsonStr = JSON.stringify(schema);
      const size = jsonStr.length;

      // Decide compression based on size
      const shouldCompress = size >= this.SIZE_THRESHOLD;
      const data = shouldCompress ? this.compress(jsonStr) : jsonStr;

      const cached: CachedSchema = {
        url,
        content: data,
        compressed: shouldCompress,
        timestamp: Date.now(),
        size,
        schemaVersion: schema.$id || schema.$schema,
      };

      const key = this.getCacheKey(url);

      try {
        localStorage.setItem(key, JSON.stringify(cached));
        return true;
      } catch (e) {
        if (e instanceof Error && e.name === "QuotaExceededError") {
          return this.handleQuotaError(key, cached);
        }
        throw e;
      }
    } catch (error) {
      console.warn(`Failed to cache schema for ${url}:`, error);
      return false;
    }
  }

  /**
   * Check if URL is in cache (regardless of staleness)
   */
  has(url: string): boolean {
    const key = this.getCacheKey(url);
    return localStorage.getItem(key) !== null;
  }

  /**
   * Check if cached schema is stale
   */
  isStale(url: string): boolean {
    try {
      const key = this.getCacheKey(url);
      const item = localStorage.getItem(key);

      if (!item) return true;

      const cached: CachedSchema = JSON.parse(item);
      return this.isStaleEntry(cached);
    } catch {
      return true;
    }
  }

  /**
   * Remove specific schema from cache
   */
  remove(url: string): void {
    const key = this.getCacheKey(url);
    localStorage.removeItem(key);
  }

  /**
   * Clear all cached schemas
   */
  clear(): void {
    const keys = this.getAllCacheKeys();
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = this.getAllCacheKeys();
    let totalSize = 0;
    let compressedSize = 0;
    let oldestTimestamp = Date.now();

    for (const key of keys) {
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const cached: CachedSchema = JSON.parse(item);
        totalSize += cached.size;
        compressedSize += cached.content.length;
        oldestTimestamp = Math.min(oldestTimestamp, cached.timestamp);
      } catch {
        // Skip invalid entries
      }
    }

    const compressionRatio =
      totalSize > 0 ? ((totalSize - compressedSize) / totalSize) * 100 : 0;

    return {
      count: keys.length,
      totalSize,
      oldestTimestamp,
      compressionRatio,
    };
  }

  /**
   * Evict oldest cached schema
   */
  evictOldest(): boolean {
    const keys = this.getAllCacheKeys();
    let oldestKey: string | null = null;
    let oldestTime = Number.POSITIVE_INFINITY;

    for (const key of keys) {
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const cached: CachedSchema = JSON.parse(item);
        if (cached.timestamp < oldestTime) {
          oldestTime = cached.timestamp;
          oldestKey = key;
        }
      } catch {
        // Skip invalid entries
      }
    }

    if (oldestKey) {
      localStorage.removeItem(oldestKey);
      return true;
    }

    return false;
  }

  /**
   * Clean all stale entries
   */
  cleanStale(): number {
    const keys = this.getAllCacheKeys();
    let cleaned = 0;

    for (const key of keys) {
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const cached: CachedSchema = JSON.parse(item);
        if (this.isStaleEntry(cached)) {
          localStorage.removeItem(key);
          cleaned++;
        }
      } catch {
        // Remove invalid entries too
        localStorage.removeItem(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Check if cache entry is stale
   */
  private isStaleEntry(cached: CachedSchema): boolean {
    const age = Date.now() - cached.timestamp;
    return age > this.MAX_AGE_MS;
  }

  /**
   * Compress data using LZ-string
   */
  private compress(data: string): string {
    return LZString.compress(data);
  }

  /**
   * Decompress data using LZ-string
   */
  private decompress(data: string): string {
    return LZString.decompress(data);
  }

  /**
   * Generate cache key from URL
   */
  private getCacheKey(url: string): string {
    // Simple hash for URL to keep keys manageable
    const hash = this.simpleHash(url);
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Simple hash function for URLs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get all cache keys for this app
   */
  private getAllCacheKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CACHE_PREFIX)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Handle quota exceeded error by evicting and retrying
   */
  private handleQuotaError(key: string, cached: CachedSchema): boolean {
    // Try to make space
    const evicted = this.evictOldest();

    if (!evicted) {
      // No old entries to evict, can't store
      return false;
    }

    // Retry once
    try {
      localStorage.setItem(key, JSON.stringify(cached));
      return true;
    } catch {
      // Still failed, give up gracefully
      return false;
    }
  }
}
