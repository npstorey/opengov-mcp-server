export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  size: number;
}

export interface LRUCacheOptions {
  maxSize: number; // Maximum cache size in bytes
  ttl: number; // Time to live in milliseconds
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private currentSize: number = 0;
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(options: LRUCacheOptions) {
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }

    // Move to end of access order (most recently used)
    this.updateAccessOrder(key);
    
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // Calculate size of the value
    const size = this.calculateSize(value);
    
    // If single item is too large, don't cache it
    if (size > this.maxSize) {
      console.warn(`[Cache] Item too large to cache: ${size} bytes > ${this.maxSize} bytes`);
      return;
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict entries until we have enough space
    while (this.currentSize + size > this.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.delete(oldestKey);
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      size
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.currentSize += size;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.currentSize -= entry.size;
    
    return true;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get the current size in bytes
   */
  sizeInBytes(): number {
    return this.currentSize;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private calculateSize(value: T): number {
    // Simple size calculation - serialize to JSON and get byte length
    // This is not perfect but good enough for our use case
    try {
      const json = JSON.stringify(value);
      return new TextEncoder().encode(json).length;
    } catch (error) {
      console.error('[Cache] Error calculating size:', error);
      // Return a conservative estimate
      return 1024; // 1KB default
    }
  }
}

// Create a singleton cache instance for document data
// 50MB max size, 5 minute TTL
export const documentCache = new LRUCache<any>({
  maxSize: 50 * 1024 * 1024, // 50MB
  ttl: 5 * 60 * 1000 // 5 minutes
});

// Periodically clean up expired entries
setInterval(() => {
  documentCache.cleanup();
}, 60 * 1000); // Every minute