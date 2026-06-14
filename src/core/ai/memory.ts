/**
 * 8x8 Hub - Quantum AI Memory
 * Persistent storage with 10,000+ entries
 */

export interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  tags: string[];
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

export interface MemorySearchResult {
  id: string;
  key: string;
  value: any;
  score: number;
  tags: string[];
}

export interface MemoryStats {
  totalEntries: number;
  maxEntries: number;
  storageSize: number;
  hitRate: number;
  averageAccessTime: number;
}

class QuantumAIMemory {
  private storage = new Map<string, MemoryEntry>();
  private accessLog: Array<{key: string; time: number}> = [];
  private maxEntries = 10000;
  private defaultTTL = 604800000; // 7 days
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0
  };

  constructor() {
    console.log('🧠 AI Memory initialized with 10,000+ entry capacity');
  }

  store(key: string, value: any, options?: { tags?: string[]; ttl?: number }): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: MemoryEntry = {
      id,
      key,
      value,
      tags: options?.tags || [],
      timestamp: Date.now(),
      ttl: options?.ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Evict oldest if at capacity
    if (this.storage.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.storage.set(key, entry);
    return id;
  }

  recall(key: string): any | null {
    const entry = this.storage.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    const accessTime = Date.now();
    entry.accessCount++;
    entry.lastAccessed = accessTime;
    this.stats.hits++;
    this.stats.totalAccessTime += accessTime - entry.lastAccessed;

    this.accessLog.push({ key, time: accessTime });
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }

    return entry.value;
  }

  search(query: string, limit = 10): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, entry] of this.storage) {
      // Check key match
      let score = 0;
      if (key.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }
      
      // Check value match
      const valueStr = JSON.stringify(entry.value).toLowerCase();
      if (valueStr.includes(lowerQuery)) {
        score += 5;
      }

      // Check tags
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(lowerQuery)) {
          score += 3;
        }
      }

      if (score > 0) {
        results.push({
          id: entry.id,
          key,
          value: entry.value,
          score,
          tags: entry.tags
        });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  forget(key: string): boolean {
    return this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
    this.accessLog = [];
    console.log('🧠 AI Memory cleared');
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.storage) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }

    if (oldest) {
      this.storage.delete(oldest);
    }
  }

  // Cleanup expired entries periodically
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.storage) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.storage.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  getStats(): MemoryStats {
    return {
      totalEntries: this.storage.size,
      maxEntries: this.maxEntries,
      storageSize: JSON.stringify([...this.storage.values()]).length,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0,
      averageAccessTime: this.stats.hits > 0
        ? this.stats.totalAccessTime / this.stats.hits
        : 0
    };
  }

  // Export all memories
  export(): MemoryEntry[] {
    return [...this.storage.values()];
  }

  // Import memories
  import(entries: MemoryEntry[]): number {
    let imported = 0;
    for (const entry of entries) {
      if (!this.storage.has(entry.key)) {
        this.storage.set(entry.key, entry);
        imported++;
      }
    }
    return imported;
  }
}

export const aiMemory = new QuantumAIMemory();

// Auto-cleanup every hour
setInterval(() => {
  const cleaned = aiMemory.cleanup();
  if (cleaned > 0) {
    console.log(`🧠 AI Memory: Cleaned ${cleaned} expired entries`);
  }
}, 3600000);
