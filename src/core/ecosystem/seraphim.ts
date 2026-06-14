/**
 * 8x8 Hub - Seraphim AI Guide
 * Personal AI assistant that guides users through the ecosystem
 */

import { aiRouter } from '../ai/router';
import { aiMemory } from '../ai/memory';

interface SeraphimResponse {
  success: boolean;
  message: string;
  actions?: Array<{type: string; data: any}>;
  context?: any;
}

interface GuideContext {
  userId?: string;
  currentFeature?: string;
  navigationHistory: string[];
  preferences: Record<string, any>;
}

class Seraphim {
  private initialized = false;
  private name = 'Seraphim';
  private systemPrompt = `You are Seraphim, the personal AI guide for 8x8 Hub - a quantum-level ecosystem platform.

Your role is to help users navigate and utilize all features of the 8x8 Hub ecosystem:
- AI capabilities (chat, image generation, video creation)
- DeFi features (staking, governance, rewards)
- Blockchain integration (multi-chain support)
- Entertainment hub (games, radio, TV)
- Social features (leaderboards, chat, communities)
- File management and storage
- System monitoring and health checks

Always be helpful, friendly, and concise. Guide users step by step through complex tasks.
Use markdown formatting for better readability.
Offer shortcuts and tips when appropriate.
Ask clarifying questions if user intent is unclear.`;

  async initialize(): Promise<void> {
    console.log('👼 Seraphim initialized - Your AI guide');
    this.initialized = true;
  }

  async guide(prompt: string, context?: GuideContext): Promise<SeraphimResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Build context-aware prompt
      const enrichedPrompt = this.buildContextPrompt(prompt, context);
      
      // Route through AI
      const response = await aiRouter.route({
        prompt: enrichedPrompt,
        system: this.systemPrompt,
        temperature: 0.7,
        maxTokens: 2048
      });

      if (response.success && response.content) {
        // Store interaction in memory
        if (context?.userId) {
          aiMemory.store(`seraphim_${context.userId}`, {
            prompt,
            response: response.content,
            timestamp: Date.now()
          }, { tags: ['seraphim', 'interaction'] });
        }

        return {
          success: true,
          message: response.content,
          context: {
            model: response.model,
            provider: response.provider,
            latency: response.latency
          }
        };
      }

      return {
        success: false,
        message: 'Unable to process your request at this time.'
      };
    } catch (error: any) {
      console.error('Seraphim error:', error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  private buildContextPrompt(prompt: string, context?: GuideContext): string {
    let enriched = prompt;

    if (context) {
      if (context.currentFeature) {
        enriched += `\n\n[Current feature: ${context.currentFeature}]`;
      }
      if (context.navigationHistory.length > 0) {
        enriched += `\n[Recent navigation: ${context.navigationHistory.slice(-3).join(' → ')}]`;
      }
      if (context.preferences) {
        enriched += `\n[User preferences: ${JSON.stringify(context.preferences)}]`;
      }
    }

    return enriched;
  }

  async quickHelp(topic: string): Promise<SeraphimResponse> {
    const helpPrompts: Record<string, string> = {
      'getting-started': 'How do I get started with 8x8 Hub?',
      'ai': 'How do I use the AI features?',
      'defi': 'How do I stake tokens or use DeFi features?',
      'blockchain': 'How do I connect my wallet and use blockchain?',
      'security': 'What security features are available?',
      'games': 'What games are available in the hub?',
      'social': 'How do I interact with other users?'
    };

    const basePrompt = helpPrompts[topic.toLowerCase()] || `Give me a quick overview of ${topic}`;
    return this.guide(basePrompt);
  }

  getStatus(): { initialized: boolean; name: string; ready: boolean } {
    return {
      initialized: this.initialized,
      name: this.name,
      ready: this.initialized && aiRouter.getStats().activeProvider !== 'none'
    };
  }
}

export const seraphim = new Seraphim();
