/**
 * 8x8 Hub - Quantum AI Router
 * Advanced multi-provider routing with health monitoring, failover, and cost optimization
 */

export interface AIProvider {
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  priority: number;
  enabled: boolean;
  requiresAuth: boolean;
  healthScore: number;
  lastChecked: number;
  averageLatency: number;
  requestCount: number;
  errorCount: number;
  costPerToken: number;
  specialties: string[];
}

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  preferredProvider?: string;
  maxCost?: number;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  provider?: string;
  latency?: number;
  tokens?: number;
  cost?: number;
  fallback?: boolean;
}

export interface RouterStats {
  providers: number;
  activeProviders: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  cacheHits: number;
  totalCost: number;
  providersStatus: ProviderStatus[];
  healthScores: Record<string, number>;
}

export interface ProviderStatus {
  name: string;
  model: string;
  enabled: boolean;
  healthScore: number;
  averageLatency: number;
  requestCount: number;
  errorRate: number;
  lastSuccess: number;
  lastError: number;
}

export interface RoutingStrategy {
  type: 'priority' | 'latency' | 'cost' | 'health' | 'balanced';
  fallbackEnabled: boolean;
  parallelQueries: boolean;
  maxParallelProviders: number;
}

class QuantumAIRouter {
  private providers: AIProvider[] = [];
  private currentProviderIndex = 0;
  private strategy: RoutingStrategy = {
    type: 'balanced',
    fallbackEnabled: true,
    parallelQueries: false,
    maxParallelProviders: 3
  };
  
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
    cacheHits: 0,
    totalCost: 0
  };

  // Health monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly LATENCY_WEIGHT = 0.3;
  private readonly HEALTH_WEIGHT = 0.4;
  private readonly COST_WEIGHT = 0.2;
  private readonly SPECIALTY_WEIGHT = 0.1;

  constructor() {
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  private initializeProviders(): void {
    console.log('🔀 QUANTUM AI ROUTER INITIALIZING...');

    // Primary: Inference.sh
    if (process.env.INFERENCE_SH_API_KEY) {
      this.providers.push({
        name: 'inference-sh',
        model: 'qwen/qwen3-32b',
        apiKey: process.env.INFERENCE_SH_API_KEY,
        baseUrl: 'https://api.inference.sh/v1',
        priority: 1,
        enabled: true,
        requiresAuth: true,
        healthScore: 100,
        lastChecked: Date.now(),
        averageLatency: 0,
        requestCount: 0,
        errorCount: 0,
        costPerToken: 0.00001,
        specialties: ['general', 'coding', 'reasoning']
      });
    }

    // Fallback: OpenRouter with multiple models
    if (process.env.OPENROUTER_API_KEY) {
      const openRouterModels = [
        { model: 'anthropic/claude-sonnet-4', priority: 2, specialties: ['reasoning', 'analysis', 'writing'] },
        { model: 'google/gemini-2-5-flash', priority: 3, specialties: ['fast', 'general', 'multimodal'] },
        { model: 'deepseek-ai/deepseek-chat-v3', priority: 4, specialties: ['coding', 'reasoning', 'cost-effective'] },
        { model: 'meta-llama/llama-3-8b-instruct', priority: 5, specialties: ['general', 'fast'] },
        { model: 'mistralai/mistral-7b-instruct', priority: 6, specialties: ['fast', 'general'] }
      ];

      for (const m of openRouterModels) {
        this.providers.push({
          name: 'openrouter',
          model: m.model,
          apiKey: process.env.OPENROUTER_API_KEY,
          baseUrl: 'https://openrouter.ai/api/v1',
          priority: m.priority,
          enabled: true,
          requiresAuth: true,
          healthScore: 100,
          lastChecked: Date.now(),
          averageLatency: 0,
          requestCount: 0,
          errorCount: 0,
          costPerToken: 0.000005,
          specialties: m.specialties
        });
      }
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai',
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        priority: 10,
        enabled: true,
        requiresAuth: true,
        healthScore: 100,
        lastChecked: Date.now(),
        averageLatency: 0,
        requestCount: 0,
        errorCount: 0,
        costPerToken: 0.000015,
        specialties: ['general', 'coding', 'fast']
      });
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push({
        name: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
        priority: 11,
        enabled: true,
        requiresAuth: true,
        healthScore: 100,
        lastChecked: Date.now(),
        averageLatency: 0,
        requestCount: 0,
        errorCount: 0,
        costPerToken: 0.00003,
        specialties: ['reasoning', 'analysis', 'writing', 'safety']
      });
    }

    // Google AI
    if (process.env.GOOGLE_AI_API_KEY) {
      this.providers.push({
        name: 'google',
        model: 'gemini-2.0-flash',
        apiKey: process.env.GOOGLE_AI_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        priority: 12,
        enabled: true,
        requiresAuth: true,
        healthScore: 100,
        lastChecked: Date.now(),
        averageLatency: 0,
        requestCount: 0,
        errorCount: 0,
        costPerToken: 0.00001,
        specialties: ['fast', 'multimodal', 'general']
      });
    }

    console.log(`🔀 AI Router initialized with ${this.providers.length} provider configurations`);
    console.log(`   Strategy: ${this.strategy.type}`);
    console.log(`   Fallback: ${this.strategy.fallbackEnabled ? 'enabled' : 'disabled'}`);
    console.log(`   Parallel: ${this.strategy.parallelQueries ? 'enabled' : 'disabled'}`);
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    // Initial health check
    setTimeout(() => this.performHealthChecks(), 5000);
  }

  private async performHealthChecks(): Promise<void> {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    for (const provider of enabledProviders) {
      try {
        const startTime = Date.now();
        const success = await this.healthCheck(provider);
        const latency = Date.now() - startTime;

        // Update health metrics
        const errorRate = provider.requestCount > 0 
          ? provider.errorCount / provider.requestCount 
          : 0;
        
        provider.healthScore = Math.max(0, 100 - (errorRate * 50) - (latency > 5000 ? 20 : 0));
        provider.averageLatency = provider.averageLatency > 0
          ? (provider.averageLatency + latency) / 2
          : latency;
        provider.lastChecked = Date.now();

        if (!success) {
          provider.errorCount++;
        }
      } catch (e) {
        provider.healthScore = Math.max(0, provider.healthScore - 10);
        provider.lastChecked = Date.now();
      }
    }
  }

  private async healthCheck(provider: AIProvider): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (provider.requiresAuth) {
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
      }

      if (provider.name === 'openrouter') {
        headers['HTTP-Referer'] = process.env.APP_URL || 'https://8x8-hub.app';
        headers['X-Title'] = '8x8 Hub';
      }

      if (provider.name === 'anthropic') {
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        
        const response = await fetch(`${provider.baseUrl}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }]
          })
        });

        return response.ok;
      }

      // Standard OpenAI-compatible check
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch (e) {
      return false;
    }
  }

  // Calculate routing score based on strategy
  private calculateRoutingScore(provider: AIProvider, request: AIRequest): number {
    let score = 0;

    switch (this.strategy.type) {
      case 'latency':
        score = 100 - (provider.averageLatency / 100);
        break;
        
      case 'cost':
        score = 100 - (provider.costPerToken * 10000);
        break;
        
      case 'health':
        score = provider.healthScore;
        break;
        
      case 'priority':
        score = 100 - provider.priority * 5;
        break;
        
      case 'balanced':
      default:
        // Weighted combination
        const latencyScore = Math.max(0, 100 - (provider.averageLatency / 100));
        score = (
          provider.healthScore * this.HEALTH_WEIGHT +
          latencyScore * this.LATENCY_WEIGHT +
          (100 - provider.costPerToken * 10000) * this.COST_WEIGHT +
          (100 - provider.priority * 3) * this.SPECIALTY_WEIGHT
        );
        break;
    }

    // Boost for specialty match
    const prompt = request.prompt.toLowerCase();
    for (const specialty of provider.specialties) {
      if (prompt.includes(specialty) || specialty.includes('fast') && prompt.length < 100) {
        score += 10;
      }
    }

    return score;
  }

  // Sort providers by routing strategy
  private sortProviders(request: AIRequest): AIProvider[] {
    let sorted = [...this.providers].filter(p => p.enabled);

    // If specific provider requested, try it first
    if (request.preferredProvider) {
      sorted = sorted.sort((a, b) => {
        if (a.name === request.preferredProvider) return -1;
        if (b.name === request.preferredProvider) return 1;
        return this.calculateRoutingScore(b, request) - this.calculateRoutingScore(a, request);
      });
    } else {
      sorted = sorted.sort((a, b) => 
        this.calculateRoutingScore(b, request) - this.calculateRoutingScore(a, request)
      );
    }

    return sorted;
  }

  async route(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Get sorted providers based on strategy
    const sortedProviders = this.sortProviders(request);
    const providersToTry = this.strategy.fallbackEnabled 
      ? sortedProviders.slice(0, 3)
      : [sortedProviders[0]];

    let lastError: string = 'No providers available';
    let usedFallback = false;

    for (const provider of providersToTry) {
      try {
        // Cost check
        if (request.maxCost) {
          const estimatedCost = (request.maxTokens || 2048) * provider.costPerToken;
          if (estimatedCost > request.maxCost) {
            continue;
          }
        }

        const response = await this.callProvider(provider, request);
        
        if (response.success) {
          this.stats.successfulRequests++;
          this.stats.totalLatency += Date.now() - startTime;
          provider.requestCount++;
          
          // Estimate cost
          if (response.tokens) {
            const cost = response.tokens * provider.costPerToken;
            this.stats.totalCost += cost;
          }

          return { 
            ...response, 
            provider: provider.name,
            cost: response.tokens ? response.tokens * provider.costPerToken : 0
          };
        } else {
          lastError = response.error || 'Unknown error';
          provider.errorCount++;
        }
      } catch (e: any) {
        console.warn(`Provider ${provider.name}/${provider.model} failed:`, e.message);
        lastError = e.message;
        provider.errorCount++;
        usedFallback = true;
      }
    }

    // All providers failed
    this.stats.failedRequests++;
    return {
      success: false,
      error: lastError,
      fallback: usedFallback
    };
  }

  private async callProvider(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (provider.requiresAuth) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    // Handle provider-specific APIs
    if (provider.name === 'openrouter') {
      headers['HTTP-Referer'] = process.env.APP_URL || 'https://8x8-hub.app';
      headers['X-Title'] = '8x8 Hub';
    }

    if (provider.name === 'anthropic') {
      headers['x-api-key'] = provider.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      
      const response = await fetch(`${provider.baseUrl}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: request.model || provider.model,
          max_tokens: request.maxTokens || 4096,
          messages: [
            ...(request.system ? [{ role: 'user' as const, content: request.system }] : []),
            { role: 'user' as const, content: request.prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        content: data.content?.[0]?.text || '',
        model: data.model,
        latency: 0
      };
    }

    if (provider.name === 'google') {
      // Google AI uses different format
      const response = await fetch(`${provider.baseUrl}/models/${request.model || provider.model}:generateContent?key=${provider.apiKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature || 0.7,
            maxOutputTokens: request.maxTokens || 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model: request.model || provider.model,
        latency: 0
      };
    }

    // Standard OpenAI-compatible API
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.model || provider.model,
        messages: [
          ...(request.system ? [{ role: 'system', content: request.system }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      latency: 0,
      tokens: data.usage?.total_tokens
    };
  }

  // Parallel query multiple providers
  async routeParallel(request: AIRequest, maxProviders = 3): Promise<AIResponse[]> {
    const sortedProviders = this.sortProviders(request).slice(0, maxProviders);
    
    const promises = sortedProviders.map(provider => 
      this.callProvider(provider, request).catch(e => ({
        success: false,
        error: e.message,
        provider: provider.name
      }))
    );

    const results = await Promise.allSettled(promises);
    
    return results
      .filter((r): r is PromiseFulfilledResult<AIResponse> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  // Get provider info
  getProviders(): AIProvider[] {
    return [...this.providers];
  }

  getProviderStatus(): ProviderStatus[] {
    return this.providers.map(p => ({
      name: p.name,
      model: p.model,
      enabled: p.enabled,
      healthScore: p.healthScore,
      averageLatency: p.averageLatency,
      requestCount: p.requestCount,
      errorRate: p.requestCount > 0 ? p.errorCount / p.requestCount : 0,
      lastSuccess: p.errorCount === 0 ? Date.now() : 0,
      lastError: p.errorCount > 0 ? Date.now() : 0
    }));
  }

  // Enable/disable provider
  setProviderEnabled(name: string, model: string, enabled: boolean): void {
    const provider = this.providers.find(p => p.name === name && p.model === model);
    if (provider) {
      provider.enabled = enabled;
      console.log(`🔀 Provider ${name}/${model} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Set routing strategy
  setStrategy(strategy: Partial<RoutingStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
    console.log('🔀 Routing strategy updated:', this.strategy);
  }

  // Get comprehensive stats
  getStats(): RouterStats {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    return {
      providers: this.providers.length,
      activeProviders: enabledProviders.length,
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageLatency: this.stats.successfulRequests > 0 
        ? this.stats.totalLatency / this.stats.successfulRequests 
        : 0,
      cacheHits: this.stats.cacheHits,
      totalCost: this.stats.totalCost,
      providersStatus: this.getProviderStatus(),
      healthScores: Object.fromEntries(
        this.providers.map(p => [`${p.name}/${p.model}`, p.healthScore])
      )
    };
  }

  // Reset stats
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
      cacheHits: 0,
      totalCost: 0
    };
    console.log('🔀 Router stats reset');
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const aiRouter = new QuantumAIRouter();
