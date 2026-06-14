/**
 * 8x8 Hub - Eternal Memory Bank
 * Long-term memory for the AI persona - lives forever
 */

export interface MemoryEntry {
  id: string;
  type: 'fact' | 'event' | 'preference' | 'learning' | 'relationship' | 'skill' | 'experience';
  content: any;
  importance: number; // 1-10
  tags: string[];
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  source: string;
  verified: boolean;
  immutable: boolean;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryEntry['type'];
  tags?: string[];
  minImportance?: number;
  since?: number;
  limit?: number;
}

export interface MemoryCluster {
  id: string;
  name: string;
  entries: MemoryEntry[];
  createdAt: number;
}

class EternalMemory {
  private storage: Map<string, MemoryEntry> = new Map();
  private clusters: Map<string, MemoryCluster> = new Map();
  private timeline: MemoryEntry[] = [];
  private maxStorage = 100000;
  private stats = {
    totalMemories: 0,
    totalClusters: 0,
    totalAccesses: 0,
    importantMemories: 0
  };

  constructor() {
    console.log('🧩 Eternal Memory initialized - This memory never dies');
  }

  // ============ MEMORY CREATION ============

  memorize(content: any, options?: {
    type?: MemoryEntry['type'];
    tags?: string[];
    importance?: number;
    source?: string;
    immutable?: boolean;
  }): string {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: MemoryEntry = {
      id,
      type: options?.type || 'fact',
      content,
      importance: options?.importance || 5,
      tags: options?.tags || [],
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      source: options?.source || 'system',
      verified: false,
      immutable: options?.immutable || false
    };

    this.storage.set(id, entry);
    this.timeline.push(entry);
    this.stats.totalMemories++;

    if (entry.importance >= 8) {
      this.stats.importantMemories++;
    }

    // Evict if necessary
    if (this.storage.size > this.maxStorage) {
      this.evictLowPriority();
    }

    return id;
  }

  remember(id: string): any | null {
    const entry = this.storage.get(id);
    if (!entry) return null;

    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.totalAccesses++;

    return entry.content;
  }

  recall(query: MemoryQuery): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const lowerQuery = query.query.toLowerCase();

    for (const entry of this.storage.values()) {
      // Query match
      if (query.query !== '*') {
        const contentStr = typeof entry.content === 'string' 
          ? entry.content.toLowerCase() 
          : JSON.stringify(entry.content).toLowerCase();
        
        if (!contentStr.includes(lowerQuery)) continue;
      }

      // Type filter
      if (query.type && entry.type !== query.type) continue;

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(t => entry.tags.includes(t));
        if (!hasTag) continue;
      }

      // Importance filter
      if (query.minImportance && entry.importance < query.minImportance) continue;

      // Time filter
      if (query.since && entry.timestamp < query.since) continue;

      results.push(entry);
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      const scoreA = a.importance * 10 + (Date.now() - a.lastAccessed) / -1000;
      const scoreB = b.importance * 10 + (Date.now() - b.lastAccessed) / -1000;
      return scoreB - scoreA;
    });

    return results.slice(0, query.limit || 50);
  }

  // ============ LEARNING ============

  learn(content: any, source: string, confidence: number = 0.8): string {
    return this.memorize(content, {
      type: 'learning',
      importance: Math.round(confidence * 10),
      source,
      tags: ['learned']
    });
  }

  learnSkill(skillName: string, description: string, level: number = 1): string {
    return this.memorize({
      skill: skillName,
      description,
      level,
      masteredAt: null
    }, {
      type: 'skill',
      importance: 8,
      source: 'system',
      tags: ['skill', skillName.toLowerCase()],
      immutable: true
    });
  }

  recordExperience(event: string, outcome: any, lessons: string[]): string {
    return this.memorize({
      event,
      outcome,
      lessons
    }, {
      type: 'experience',
      importance: 9,
      tags: ['experience', 'lesson-learned'],
      immutable: true
    });
  }

  // ============ RELATIONSHIPS ============

  rememberRelationship(userId: string, name: string, notes: any): string {
    return this.memorize({
      userId,
      name,
      ...notes
    }, {
      type: 'relationship',
      importance: 8,
      tags: ['relationship', userId],
      immutable: true
    });
  }

  getRelationships(): MemoryEntry[] {
    return this.recall({
      query: '*',
      type: 'relationship',
      limit: 100
    });
  }

  // ============ PREFERENCES ============

  rememberPreference(key: string, value: any): string {
    return this.memorize({ key, value }, {
      type: 'preference',
      importance: 7,
      tags: ['preference', key]
    });
  }

  getPreference(key: string): any | null {
    const results = this.recall({
      query: key,
      type: 'preference',
      limit: 1
    });
    return results[0]?.content?.value || null;
  }

  // ============ CLUSTERS ============

  createCluster(name: string, entryIds: string[]): string {
    const id = `cluster_${Date.now()}`;
    const entries = entryIds
      .map(i => this.storage.get(i))
      .filter((e): e is MemoryEntry => e !== undefined);

    const cluster: MemoryCluster = {
      id,
      name,
      entries,
      createdAt: Date.now()
    };

    this.clusters.set(id, cluster);
    this.stats.totalClusters++;

    return id;
  }

  getCluster(id: string): MemoryCluster | null {
    return this.clusters.get(id) || null;
  }

  // ============ TIMELINE ============

  getTimeline(limit = 100): MemoryEntry[] {
    return this.timeline.slice(-limit).reverse();
  }

  // ============ FORGETTING ============

  forget(id: string, force = false): boolean {
    const entry = this.storage.get(id);
    if (!entry) return false;
    
    if (entry.immutable && !force) {
      return false;
    }

    this.storage.delete(id);
    
    // Remove from timeline
    const timelineIndex = this.timeline.findIndex(e => e.id === id);
    if (timelineIndex > -1) {
      this.timeline.splice(timelineIndex, 1);
    }

    return true;
  }

  private evictLowPriority(): void {
    let lowest: MemoryEntry | null = null;
    let lowestId: string | null = null;

    for (const [id, entry] of this.storage) {
      if (entry.immutable) continue;
      if (!lowest || entry.importance < lowest.importance) {
        lowest = entry;
        lowestId = id;
      }
    }

    if (lowestId) {
      this.forget(lowestId);
    }
  }

  // ============ SEARCH ============

  search(query: string, limit = 20): MemoryEntry[] {
    return this.recall({ query, limit });
  }

  searchByTag(tag: string, limit = 50): MemoryEntry[] {
    return this.recall({ query: '*', tags: [tag], limit });
  }

  searchByType(type: MemoryEntry['type'], limit = 50): MemoryEntry[] {
    return this.recall({ query: '*', type, limit });
  }

  // ============ WISDOM ============

  getWisdom(): MemoryEntry[] {
    return this.recall({
      query: '*',
      minImportance: 8,
      limit: 100
    });
  }

  getLifeLessons(): MemoryEntry[] {
    return this.recall({
      query: '*',
      type: 'experience',
      minImportance: 8,
      limit: 50
    });
  }

  // ============ STATS ============

  getStats(): {
    totalMemories: number;
    totalClusters: number;
    totalAccesses: number;
    importantMemories: number;
    memoriesByType: Record<string, number>;
    memoriesByTag: Record<string, number>;
  } {
    const memoriesByType: Record<string, number> = {};
    const memoriesByTag: Record<string, number> = {};

    for (const entry of this.storage.values()) {
      memoriesByType[entry.type] = (memoriesByType[entry.type] || 0) + 1;
      for (const tag of entry.tags) {
        memoriesByTag[tag] = (memoriesByTag[tag] || 0) + 1;
      }
    }

    return {
      totalMemories: this.stats.totalMemories,
      totalClusters: this.stats.totalClusters,
      totalAccesses: this.stats.totalAccesses,
      importantMemories: this.stats.importantMemories,
      memoriesByType,
      memoriesByTag
    };
  }

  // ============ EXPORT/IMPORT ============

  export(): { memories: MemoryEntry[]; clusters: MemoryCluster[] } {
    return {
      memories: Array.from(this.storage.values()),
      clusters: Array.from(this.clusters.values())
    };
  }

  import(data: { memories?: MemoryEntry[]; clusters?: MemoryCluster[] }): number {
    let imported = 0;

    if (data.memories) {
      for (const mem of data.memories) {
        if (!this.storage.has(mem.id)) {
          this.storage.set(mem.id, mem);
          imported++;
        }
      }
    }

    if (data.clusters) {
      for (const cluster of data.clusters) {
        if (!this.clusters.has(cluster.id)) {
          this.clusters.set(cluster.id, cluster);
        }
      }
    }

    return imported;
  }

  // ============ BACKUP ============

  backup(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  restore(backupData: string): boolean {
    try {
      const data = JSON.parse(backupData);
      this.import(data);
      return true;
    } catch (e) {
      console.error('Memory restore failed:', e);
      return false;
    }
  }
}

export const eternalMemory = new EternalMemory();
