/**
 * 8x8 Hub - Quantum Ears
 * Listening and input processing capabilities
 */

import { EventEmitter } from 'events';

export interface Listener {
  id: string;
  type: string;
  callback: (data: any) => void | Promise<void>;
  pattern?: RegExp;
  createdAt: number;
  active: boolean;
}

export interface InputSource {
  name: string;
  type: 'webhook' | 'websocket' | 'telegram' | 'email' | 'api' | 'cron' | 'custom';
  enabled: boolean;
  lastInput: number;
  totalInputs: number;
}

export interface AudioInput {
  source: string;
  type: 'command' | 'query' | 'notification' | 'event';
  data: any;
  timestamp: number;
}

class QuantumEars extends EventEmitter {
  private listeners: Map<string, Listener> = new Map();
  private inputSources: Map<string, InputSource> = new Map();
  private inputBuffer: AudioInput[] = [];
  private maxBufferSize = 500;
  private stats = {
    totalInputs: 0,
    processedInputs: 0,
    ignoredInputs: 0
  };

  constructor() {
    super();
    this.initializeDefaultSources();
    console.log('👂 Quantum Ears initialized - Listening for inputs');
  }

  private initializeDefaultSources(): void {
    this.registerSource('telegram', 'telegram');
    this.registerSource('webhook', 'webhook');
    this.registerSource('api', 'api');
    this.registerSource('cron', 'cron');
    this.registerSource('system', 'custom');
  }

  // ============ LISTENER MANAGEMENT ============

  addListener(type: string, callback: (data: any) => void | Promise<void>, pattern?: string): string {
    const id = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const listener: Listener = {
      id,
      type,
      callback,
      pattern: pattern ? new RegExp(pattern, 'i') : undefined,
      createdAt: Date.now(),
      active: true
    };

    this.listeners.set(id, listener);
    return id;
  }

  removeListener(id: string): boolean {
    return this.listeners.delete(id);
  }

  removeAllListeners(type?: string): number {
    if (type) {
      let count = 0;
      for (const [id, listener] of this.listeners) {
        if (listener.type === type) {
          this.listeners.delete(id);
          count++;
        }
      }
      return count;
    }
    
    const count = this.listeners.size;
    this.listeners.clear();
    return count;
  }

  // ============ INPUT SOURCES ============

  registerSource(name: string, type: InputSource['type']): void {
    this.inputSources.set(name, {
      name,
      type,
      enabled: true,
      lastInput: 0,
      totalInputs: 0
    });
  }

  enableSource(name: string): boolean {
    const source = this.inputSources.get(name);
    if (source) {
      source.enabled = true;
      return true;
    }
    return false;
  }

  disableSource(name: string): boolean {
    const source = this.inputSources.get(name);
    if (source) {
      source.enabled = false;
      return true;
    }
    return false;
  }

  // ============ INPUT PROCESSING ============

  hear(source: string, type: 'command' | 'query' | 'notification' | 'event', data: any): void {
    this.stats.totalInputs++;
    
    const input: AudioInput = {
      source,
      type,
      data,
      timestamp: Date.now()
    };

    // Update source stats
    const sourceInfo = this.inputSources.get(source);
    if (sourceInfo) {
      sourceInfo.lastInput = Date.now();
      sourceInfo.totalInputs++;
    }

    // Add to buffer
    this.inputBuffer.push(input);
    if (this.inputBuffer.length > this.maxBufferSize) {
      this.inputBuffer.shift();
    }

    // Emit event for listeners
    this.emit('input', input);
    this.emit(`${source}:${type}`, data);
    this.emit(source, input);

    // Process through listeners
    this.processThroughListeners(input);
  }

  private processThroughListeners(input: AudioInput): void {
    for (const listener of this.listeners.values()) {
      if (!listener.active) continue;
      
      // Type match
      if (listener.type !== input.type && listener.type !== '*') continue;
      
      // Pattern match if specified
      if (listener.pattern) {
        const dataStr = typeof input.data === 'string' ? input.data : JSON.stringify(input.data);
        if (!listener.pattern.test(dataStr)) continue;
      }

      // Execute callback
      try {
        Promise.resolve(listener.callback(input.data));
        this.stats.processedInputs++;
      } catch (e) {
        console.error(`Listener ${listener.id} error:`, e);
        this.stats.ignoredInputs++;
      }
    }
  }

  // ============ COMMAND LISTENING ============

  listenForCommand(pattern: string, callback: (command: string, args: string[]) => void | Promise<void>): string {
    return this.addListener('command', async (data: any) => {
      if (typeof data === 'string') {
        const parts = data.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);
        await callback(command, args);
      }
    }, pattern);
  }

  // ============ QUERY LISTENING ============

  listenForQuery(keywords: string[], callback: (query: string) => void | Promise<void>): string {
    return this.addListener('query', async (data: any) => {
      if (typeof data === 'string') {
        const hasKeyword = keywords.some(k => data.toLowerCase().includes(k.toLowerCase()));
        if (hasKeyword) {
          await callback(data);
        }
      }
    });
  }

  // ============ EVENT LISTENING ============

  listenForEvent(eventType: string, callback: (event: any) => void | Promise<void>): string {
    return this.addListener('event', async (data: any) => {
      if (data.type === eventType) {
        await callback(data);
      }
    });
  }

  // ============ UTILITIES ============

  getBuffer(limit = 50): AudioInput[] {
    return this.inputBuffer.slice(-limit);
  }

  getListeners(): Listener[] {
    return Array.from(this.listeners.values());
  }

  getActiveListeners(): Listener[] {
    return Array.from(this.listeners.values()).filter(l => l.active);
  }

  getSources(): InputSource[] {
    return Array.from(this.inputSources.values());
  }

  getStats(): { totalInputs: number; processedInputs: number; ignoredInputs: number; listeners: number; sources: number } {
    return {
      totalInputs: this.stats.totalInputs,
      processedInputs: this.stats.processedInputs,
      ignoredInputs: this.stats.ignoredInputs,
      listeners: this.listeners.size,
      sources: this.inputSources.size
    };
  }

  clearBuffer(): void {
    this.inputBuffer = [];
  }

  // ============ WEBHOOK ENDPOINT ============

  createWebhookEndpoint(path: string, callback: (data: any) => void): void {
    this.addListener('webhook', callback);
    console.log(`👂 Webhook endpoint created: /webhook${path}`);
  }

  // ============ TELEGRAM LISTENER ============

  setupTelegramListener(callback: (message: any) => void): string {
    return this.addListener('telegram', callback);
  }

  // ============ CRON LISTENER ============

  addCronListener(schedule: string, callback: () => void | Promise<void>): string {
    const listenerId = this.addListener('cron', async () => {
      await callback();
    });
    
    console.log(`👂 Cron listener added: ${schedule}`);
    return listenerId;
  }
}

export const ears = new QuantumEars();
