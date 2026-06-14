/**
 * 8x8 Hub - Quantum Sessions
 * Session management with quantum-resistant security
 */

import * as crypto from 'crypto';

export interface Session {
  id: string;
  userId?: string;
  data: Record<string, any>;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  ip?: string;
  userAgent?: string;
}

export interface SessionConfig {
  ttl: number; // milliseconds
  maxSessions: number;
  enableQuantumResistance: boolean;
}

interface SessionStats {
  active: number;
  total: number;
  expired: number;
  averageLifetime: number;
}

class QuantumSessions {
  private sessions = new Map<string, Session>();
  private config: SessionConfig = {
    ttl: 2592000000, // 30 days
    maxSessions: 100000,
    enableQuantumResistance: true
  };
  private stats = {
    created: 0,
    destroyed: 0,
    hits: 0,
    misses: 0
  };

  constructor() {
    console.log('🔐 Quantum Sessions initialized (30-day TTL)');
    
    // Cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  create(userId?: string, data?: Record<string, any>, options?: { ip?: string; userAgent?: string }): string {
    // Enforce max sessions
    if (this.sessions.size >= this.config.maxSessions) {
      this.cleanup();
      if (this.sessions.size >= this.config.maxSessions) {
        throw new Error('Maximum session limit reached');
      }
    }

    const id = this.generateSessionId();
    const now = Date.now();

    const session: Session = {
      id,
      userId,
      data: data || {},
      createdAt: now,
      lastAccessed: now,
      expiresAt: now + this.config.ttl,
      ip: options?.ip,
      userAgent: options?.userAgent
    };

    this.sessions.set(id, session);
    this.stats.created++;
    this.stats.hits++;

    return id;
  }

  get(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.destroy(sessionId);
      this.stats.misses++;
      return null;
    }

    // Update last accessed
    session.lastAccessed = Date.now();
    this.stats.hits++;

    return session;
  }

  set(sessionId: string, key: string, value: any): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    session.data[key] = value;
    return true;
  }

  getData(sessionId: string, key: string): any {
    const session = this.get(sessionId);
    if (!session) return undefined;
    return session.data[key];
  }

  destroy(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.stats.destroyed++;
    }
    return deleted;
  }

  destroyAll(userId?: string): number {
    let count = 0;
    
    if (userId) {
      for (const [id, session] of this.sessions) {
        if (session.userId === userId) {
          this.sessions.delete(id);
          count++;
        }
      }
    } else {
      count = this.sessions.size;
      this.sessions.clear();
    }

    this.stats.destroyed += count;
    return count;
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(32).toString('hex');
    
    if (this.config.enableQuantumResistance) {
      // Add quantum-resistant salt
      const quantumSalt = crypto.randomBytes(16).toString('hex');
      return `qs_${timestamp}_${quantumSalt}_${random}`;
    }
    
    return `sess_${timestamp}_${random}`;
  }

  private cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🔐 Sessions: Cleaned ${cleaned} expired sessions`);
    }

    return cleaned;
  }

  getStats(): SessionStats {
    let totalLifetime = 0;
    let expired = 0;
    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (now > session.expiresAt) {
        expired++;
      } else {
        totalLifetime += session.expiresAt - session.createdAt;
      }
    }

    const active = this.sessions.size - expired;

    return {
      active,
      total: this.stats.created,
      expired,
      averageLifetime: active > 0 ? totalLifetime / active : 0
    };
  }

  configure(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔐 Sessions reconfigured');
  }

  // Validate session integrity
  validate(sessionId: string): { valid: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (Date.now() > session.expiresAt) {
      return { valid: false, reason: 'Session expired' };
    }

    return { valid: true };
  }

  // Extend session TTL
  extend(sessionId: string, ttl?: number): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    session.expiresAt = Date.now() + (ttl || this.config.ttl);
    return true;
  }
}

export const sessions = new QuantumSessions();
