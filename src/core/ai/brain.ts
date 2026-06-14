/**
 * 8x8 Hub - Quantum AI Brain
 * Advanced AI intelligence with multi-model orchestration, streaming, and caching
 */

import { aiMemory } from './memory';
import { aiRouter } from './router';

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
  stream?: boolean;
  contextId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  latency?: number;
  tokens?: number;
  cached?: boolean;
  alternatives?: AlternativeResponse[];
}

export interface AlternativeResponse {
  content: string;
  model: string;
  score: number;
  latency: number;
}

export interface ConversationContext {
  id: string;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  createdAt: number;
  lastAccessed: number;
  tokenCount: number;
  metadata?: Record<string, any>;
}

export interface AIStatus {
  initialized: boolean;
  provider: string;
  primaryModel: string;
  totalRequests: number;
  totalTokens: number;
  successRate: number;
  averageLatency: number;
  cacheHitRate: number;
  activeContexts: number;
  streamingEnabled: boolean;
  multiModelEnabled: boolean;
}

export interface StreamingCallbacks {
  onChunk?: (text: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

export interface QualityScore {
  overall: number;
  coherence: number;
  relevance: number;
  creativity: number;
  technical: number;
}

class QuantumAIBrain {
  private initialized = false;
  private provider = 'multi-provider';
  private primaryModel = 'qwen/qwen3-32b';
  private apiKey = process.env.INFERENCE_SH_API_KEY;
  private baseUrl = 'https://api.inference.sh/v1';
  
  // Advanced features
  private cache = new Map<string, { response: AIResponse; timestamp: number; ttl: number }>();
  private contexts = new Map<string, ConversationContext>();
  private maxContextAge = 24 * 60 * 60 * 1000; // 24 hours
  private maxContexts = 1000;
  
  // Multi-model orchestration
  private enableMultiModel = true;
  private modelPool: string[] = [
    'qwen/qwen3-32b',
    'anthropic/claude-sonnet-4',
    'google/gemini-2-5-flash',
    'deepseek-ai/deepseek-chat-v3'
  ];
  
  // Stats
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    totalTokens: 0,
    totalLatency: 0,
    cacheHits: 0,
    cacheMisses: 0,
    multiModelQueries: 0,
    streamingRequests: 0
  };

  async initialize(): Promise<void> {
    if (this.apiKey) {
      console.log('🧠 QUANTUM AI BRAIN INITIALIZED');
      console.log('   ╔══════════════════════════════════════════╗');
      console.log('   ║  🚀 QUANTUM FEATURES ENABLED            ║');
      console.log('   ╠══════════════════════════════════════════╣');
      console.log('   ║  ✨ Streaming Responses                 ║');
      console.log('   ║  🧠 Multi-Model Orchestration           ║');
      console.log('   ║  💾 Intelligent Caching                 ║');
      console.log('   ║  🔄 Context Management                  ║');
      console.log('   ║  🎯 Quality Scoring                     ║');
      console.log('   ║  ⚡ Latency Optimization                ║');
      console.log('   ╚══════════════════════════════════════════╝');
      console.log(`   Primary Model: ${this.primaryModel}`);
      console.log(`   Model Pool: ${this.modelPool.length} models available`);
      this.initialized = true;
      
      // Start maintenance tasks
      this.startMaintenance();
    } else {
      console.warn('⚠️ No INFERENCE_SH_API_KEY - AI features limited');
    }
  }

  private startMaintenance(): void {
    // Cleanup old contexts every hour
    setInterval(() => this.cleanupContexts(), 3600000);
    // Cleanup expired cache entries every 5 minutes
    setInterval(() => this.cleanupCache(), 300000);
  }

  private cleanupContexts(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, context] of this.contexts) {
      if (now - context.lastAccessed > this.maxContextAge || 
          now - context.createdAt > 7 * 24 * 60 * 60 * 1000) {
        this.contexts.delete(id);
        cleaned++;
      }
    }
    
    // Also enforce max contexts limit
    while (this.contexts.size > this.maxContexts) {
      const oldest = [...this.contexts.entries()]
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0];
      if (oldest) {
        this.contexts.delete(oldest[0]);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧠 AI Brain: Cleaned ${cleaned} old contexts`);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧠 AI Brain Cache: Removed ${cleaned} expired entries`);
    }
  }

  // Generate cache key from request
  private getCacheKey(request: AIRequest): string {
    const data = JSON.stringify({
      prompt: request.prompt,
      model: request.model || this.primaryModel,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      system: request.system
    });
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `cache_${Math.abs(hash).toString(36)}`;
  }

  // Check cache for existing response
  private getCachedResponse(key: string): AIResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    this.stats.cacheHits++;
    return { ...entry.response, cached: true };
  }

  // Store response in cache
  private cacheResponse(key: string, response: AIResponse): void {
    const ttl = response.cached ? 5 * 60 * 1000 : 30 * 60 * 1000; // 5 min for cached, 30 min for fresh
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl
    });
  }

  // Context management
  createContext(metadata?: Record<string, any>): string {
    const id = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.contexts.set(id, {
      id,
      messages: [],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      tokenCount: 0,
      metadata
    });
    
    return id;
  }

  getContext(contextId: string): ConversationContext | null {
    const context = this.contexts.get(contextId);
    if (context) {
      context.lastAccessed = Date.now();
    }
    return context || null;
  }

  addToContext(contextId: string, role: string, content: string): void {
    const context = this.contexts.get(contextId);
    if (context) {
      context.messages.push({
        role,
        content,
        timestamp: Date.now()
      });
      context.lastAccessed = Date.now();
      
      // Estimate token count (rough: 1 token ≈ 4 chars)
      context.tokenCount += Math.ceil(content.length / 4);
      
      // Trim if too long (keep last 128k tokens)
      const maxTokens = 128 * 1000;
      while (context.tokenCount > maxTokens && context.messages.length > 2) {
        const removed = context.messages.shift();
        if (removed) {
          context.tokenCount -= Math.ceil(removed.content.length / 4);
        }
      }
    }
  }

  // Main query with caching and optimization
  async query(prompt: string, options?: Partial<AIRequest>): Promise<AIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Build request
    const request: AIRequest = {
      prompt,
      model: options?.model || this.primaryModel,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
      system: options?.system || 'You are 8x8 Hub AI, a helpful assistant.',
      stream: false,
      priority: options?.priority || 'normal'
    };

    // Check cache
    const cacheKey = this.getCacheKey(request);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      console.log('🧠 AI Brain: Cache HIT');
      return cached;
    }
    this.stats.cacheMisses++;

    try {
      // Route through AI router for multi-provider support
      const routerResponse = await aiRouter.route({
        prompt: request.prompt,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        system: request.system
      });

      if (routerResponse.success) {
        const latency = Date.now() - startTime;
        this.stats.successfulRequests++;
        this.stats.totalLatency += latency;
        if (routerResponse.tokens) {
          this.stats.totalTokens += routerResponse.tokens;
        }

        const response: AIResponse = {
          success: true,
          content: routerResponse.content,
          model: routerResponse.model || request.model,
          latency,
          tokens: routerResponse.tokens
        };

        // Cache the response
        this.cacheResponse(cacheKey, response);

        return response;
      } else {
        throw new Error(routerResponse.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('AI Brain query error:', error);
      
      // Try alternative models if multi-model is enabled
      if (this.enableMultiModel && options?.model === undefined) {
        const altResponse = await this.tryAlternativeModels(request);
        if (altResponse.success) {
          return altResponse;
        }
      }

      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  // Try alternative models
  private async tryAlternativeModels(request: AIRequest): Promise<AIResponse> {
    this.stats.multiModelQueries++;
    
    const alternatives: AlternativeResponse[] = [];
    const modelsToTry = this.modelPool.filter(m => m !== request.model).slice(0, 2);

    for (const model of modelsToTry) {
      try {
        const startTime = Date.now();
        const response = await aiRouter.route({
          ...request,
          model
        });

        if (response.success) {
          const latency = Date.now() - startTime;
          alternatives.push({
            content: response.content || '',
            model: response.model || model,
            score: this.calculateQualityScore(response.content || ''),
            latency
          });
        }
      } catch (e) {
        console.warn(`Model ${model} failed, trying next...`);
      }
    }

    if (alternatives.length > 0) {
      // Sort by score and return best
      alternatives.sort((a, b) => b.score - a.score);
      const best = alternatives[0];
      
      return {
        success: true,
        content: best.content,
        model: best.model,
        latency: best.latency,
        alternatives: alternatives.slice(1, 3)
      };
    }

    return { success: false, error: 'All models failed' };
  }

  // Calculate quality score for response
  private calculateQualityScore(content: string): number {
    let score = 0.5; // Base score
    
    // Length check (not too short, not too long)
    if (content.length > 100) score += 0.1;
    if (content.length > 500) score += 0.1;
    
    // Structure indicators
    if (content.includes('\n')) score += 0.1;
    if (content.includes('.')) score += 0.1;
    
    // Coherence indicators
    const coherenceWords = ['however', 'therefore', 'furthermore', 'moreover', 'consequently'];
    for (const word of coherenceWords) {
      if (content.toLowerCase().includes(word)) score += 0.05;
    }
    
    // Technical indicators
    const techWords = ['function', 'method', 'class', 'interface', 'api', 'system'];
    for (const word of techWords) {
      if (content.toLowerCase().includes(word)) score += 0.03;
    }
    
    return Math.min(score, 1.0);
  }

  // Get detailed quality score
  getQualityScore(content: string): QualityScore {
    const overall = this.calculateQualityScore(content);
    
    return {
      overall,
      coherence: this.scoreCoherence(content),
      relevance: this.scoreRelevance(content),
      creativity: this.scoreCreativity(content),
      technical: this.scoreTechnical(content)
    };
  }

  private scoreCoherence(content: string): number {
    const coherenceWords = ['however', 'therefore', 'furthermore', 'because', 'although', 'consequently'];
    const matches = coherenceWords.filter(w => content.toLowerCase().includes(w)).length;
    return Math.min(matches / 3, 1.0);
  }

  private scoreRelevance(content: string): number {
    // Simple length-based relevance
    return Math.min(content.length / 1000, 1.0);
  }

  private scoreCreativity(content: string): number {
    const creativeWords = ['innovative', 'unique', 'creative', 'novel', 'imagine', 'explore'];
    const matches = creativeWords.filter(w => content.toLowerCase().includes(w)).length;
    return Math.min(matches / 2, 1.0);
  }

  private scoreTechnical(content: string): number {
    const techPatterns = [
      /\bfunction\b/,
      /\bclass\b/,
      /\bapi\b/i,
      /\bmodule\b/,
      /\binterface\b/,
      /\basync\b/,
      /\bawait\b/
    ];
    const matches = techPatterns.filter(p => p.test(content)).length;
    return Math.min(matches / 3, 1.0);
  }

  // Streaming query
  async queryStream(
    prompt: string, 
    options: Partial<AIRequest> = {},
    callbacks: StreamingCallbacks = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.streamingRequests++;

    const request: AIRequest = {
      prompt,
      model: options.model || this.primaryModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 2048,
      system: options.system || 'You are 8x8 Hub AI, a helpful assistant.',
      stream: true
    };

    try {
      const apiKey = this.apiKey || process.env.OPENROUTER_API_KEY;
      const baseUrl = this.apiKey ? this.baseUrl : 'https://openrouter.ai/api/v1';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (process.env.OPENROUTER_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.OPENROUTER_API_KEY}`;
        headers['HTTP-Referer'] = process.env.APP_URL || 'https://8x8-hub.app';
        headers['X-Title'] = '8x8 Hub';
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: request.model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: prompt }
          ],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                callbacks.onChunk?.(content);
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      const latency = Date.now() - startTime;
      this.stats.successfulRequests++;
      this.stats.totalLatency += latency;

      callbacks.onComplete?.(fullContent);

      return {
        success: true,
        content: fullContent,
        model: request.model,
        latency
      };
    } catch (error: any) {
      console.error('AI Brain streaming error:', error);
      callbacks.onError?.(error.message);
      
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  // Multi-model synthesis - query multiple models and synthesize
  async synthesize(
    prompt: string,
    options: Partial<AIRequest> = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.multiModelQueries++;

    const models = options.model 
      ? [options.model] 
      : this.modelPool.slice(0, 3);

    const responses: AlternativeResponse[] = [];

    // Query all models in parallel
    const promises = models.map(async (model) => {
      try {
        const modelStart = Date.now();
        const response = await this.query(prompt, { ...options, model });
        
        if (response.success) {
          return {
            content: response.content || '',
            model,
            score: this.calculateQualityScore(response.content || ''),
            latency: Date.now() - modelStart
          };
        }
      } catch (e) {
        // Model failed
      }
      return null;
    });

    const results = await Promise.all(promises);
    responses.push(...results.filter((r): r is AlternativeResponse => r !== null));

    if (responses.length === 0) {
      return {
        success: false,
        error: 'All models failed',
        latency: Date.now() - startTime
      };
    }

    // Sort by score
    responses.sort((a, b) => b.score - a.score);

    // Synthesize best responses
    const bestResponse = responses[0];
    const synthesisPrompt = `Given these expert responses on the topic, synthesize a comprehensive answer that combines the best insights:\n\n${responses.map((r, i) => `Expert ${i + 1} (${r.model}): ${r.content}`).join('\n\n')}`;
    
    // Generate synthesized response
    const finalResponse = await this.query(synthesisPrompt, {
      ...options,
      model: this.primaryModel,
      system: 'You are a synthesis expert. Combine multiple expert perspectives into one comprehensive, accurate response.'
    });

    const latency = Date.now() - startTime;
    this.stats.successfulRequests++;
    this.stats.totalLatency += latency;

    return {
      success: true,
      content: finalResponse.content,
      model: 'synthesized',
      latency,
      tokens: finalResponse.tokens,
      alternatives: responses.slice(1, 3)
    };
  }

  // Chat with context
  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: Partial<AIRequest>
  ): Promise<AIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const apiKey = this.apiKey || process.env.OPENROUTER_API_KEY;
      const baseUrl = this.apiKey ? this.baseUrl : 'https://openrouter.ai/api/v1';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (process.env.OPENROUTER_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.OPENROUTER_API_KEY}`;
        headers['HTTP-Referer'] = process.env.APP_URL || 'https://8x8-hub.app';
        headers['X-Title'] = '8x8 Hub';
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: options?.model || this.primaryModel,
          messages: [
            ...(options?.system ? [{ role: 'system', content: options.system }] : [{ role: 'system', content: 'You are 8x8 Hub AI, a helpful assistant.' }]),
            ...messages
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      
      this.stats.successfulRequests++;
      this.stats.totalLatency += latency;
      if (data.usage) {
        this.stats.totalTokens += data.usage.total_tokens || 0;
      }

      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        model: data.model,
        latency,
        tokens: data.usage?.total_tokens
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  // Optimized completion
  async complete(
    prompt: string,
    contextId?: string,
    options?: Partial<AIRequest>
  ): Promise<AIResponse> {
    // Build prompt with context if available
    let fullPrompt = prompt;
    
    if (contextId) {
      const context = this.getContext(contextId);
      if (context && context.messages.length > 0) {
        const recentMessages = context.messages.slice(-10);
        const contextText = recentMessages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');
        fullPrompt = `Context:\n${contextText}\n\nCurrent request: ${prompt}`;
      }
    }

    const response = await this.query(fullPrompt, options);

    // Update context if provided
    if (contextId && response.success) {
      this.addToContext(contextId, 'user', prompt);
      this.addToContext(contextId, 'assistant', response.content || '');
    }

    return response;
  }

  // Get comprehensive status
  getStatus(): AIStatus {
    const totalRequests = this.stats.totalRequests;
    const successfulRequests = this.stats.successfulRequests;
    const cacheHits = this.stats.cacheHits;
    const cacheMisses = this.stats.cacheMisses;
    const cacheTotal = cacheHits + cacheMisses;

    return {
      initialized: this.initialized,
      provider: this.provider,
      primaryModel: this.primaryModel,
      totalRequests,
      totalTokens: this.stats.totalTokens,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      averageLatency: successfulRequests > 0 ? this.stats.totalLatency / successfulRequests : 0,
      cacheHitRate: cacheTotal > 0 ? (cacheHits / cacheTotal) * 100 : 0,
      activeContexts: this.contexts.size,
      streamingEnabled: true,
      multiModelEnabled: this.enableMultiModel
    };
  }

  // Get detailed stats
  getDetailedStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      contextsActive: this.contexts.size,
      modelPool: this.modelPool
    };
  }

  // Configure brain
  configure(options: {
    enableMultiModel?: boolean;
    modelPool?: string[];
    primaryModel?: string;
    maxContexts?: number;
    maxContextAge?: number;
  }): void {
    if (options.enableMultiModel !== undefined) {
      this.enableMultiModel = options.enableMultiModel;
    }
    if (options.modelPool) {
      this.modelPool = options.modelPool;
    }
    if (options.primaryModel) {
      this.primaryModel = options.primaryModel;
    }
    if (options.maxContexts) {
      this.maxContexts = options.maxContexts;
    }
    if (options.maxContextAge) {
      this.maxContextAge = options.maxContextAge;
    }
    
    console.log('🧠 AI Brain reconfigured:', options);
  }

  // Clear all data
  clear(): void {
    this.cache.clear();
    this.contexts.clear();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      totalTokens: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      multiModelQueries: 0,
      streamingRequests: 0
    };
    console.log('🧠 AI Brain cleared');
  }
}

export const aiBrain = new QuantumAIBrain();
