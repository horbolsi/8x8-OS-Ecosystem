/**
 * inference.sh AI Router
 * Primary AI engine using inference.sh CLI with unlimited free models
 */

import { execSync, spawn } from 'child_process';
import { env } from 'process';

const INFERENCE_SH_API_KEY = env.INFERENCE_SH_API_KEY || '';
const DEFAULT_MODEL = env.AI_MODEL || 'openrouter/qwen3-32b';
const FALLBACK_MODELS = (env.AI_FALLBACK_MODELS || 'openrouter/deepseek-chat,google/gemini-2-5-flash').split(',');

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system?: string;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

/**
 * Execute inference.sh CLI command
 */
function executeInference(command: string): string {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      env: {
        ...process.env,
        INFERENCE_SH_API_KEY,
      },
    });
    return result;
  } catch (error: any) {
    throw new Error(`inference.sh error: ${error.message}`);
  }
}

/**
 * Query AI model via inference.sh
 */
export async function queryAI(request: AIRequest): Promise<AIResponse> {
  const model = request.model || DEFAULT_MODEL;
  
  // Prepare input JSON
  const input: any = {
    prompt: request.prompt,
  };
  
  if (request.system) {
    input.system = request.system;
  }
  
  if (request.temperature !== undefined) {
    input.temperature = request.temperature;
  }
  
  if (request.max_tokens) {
    input.max_tokens = request.max_tokens;
  }
  
  try {
    // Try primary model
    const command = `infsh app run ${model} --input '${JSON.stringify(input).replace(/'/g, "'\\''")}' --no-wait`;
    const taskId = executeInference(command).trim();
    
    // Poll for result
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
      
      try {
        const resultJson = executeInference(`infsh task get ${taskId}`);
        const result = JSON.parse(resultJson);
        
        if (result.status === 'completed') {
          return {
            content: result.output || result.response || '',
            model,
            usage: result.usage,
          };
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Task failed');
        }
      } catch {
        // Task might not be ready yet
      }
      
      attempts++;
    }
    
    throw new Error('Task timed out');
  } catch (error: any) {
    // Try fallback models
    for (const fallbackModel of FALLBACK_MODELS) {
      try {
        const fallbackInput = { ...input };
        const command = `infsh app run ${fallbackModel} --input '${JSON.stringify(fallbackInput).replace(/'/g, "'\\''")}' --no-wait`;
        const taskId = executeInference(command).trim();
        
        // Wait for result
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          try {
            const resultJson = executeInference(`infsh task get ${taskId}`);
            const result = JSON.parse(resultJson);
            
            if (result.status === 'completed') {
              return {
                content: result.output || result.response || '',
                model: fallbackModel,
                usage: result.usage,
              };
            }
          } catch {
            // Continue waiting
          }
        }
      } catch {
        // Try next fallback
        continue;
      }
    }
    
    return {
      content: '',
      model,
      error: error.message,
    };
  }
}

/**
 * Streaming AI query
 */
export async function* streamAI(request: AIRequest): AsyncGenerator<string, void, unknown> {
  const model = request.model || DEFAULT_MODEL;
  
  const input: any = {
    prompt: request.prompt,
  };
  
  if (request.system) {
    input.system = request.system;
  }
  
  const proc = spawn('infsh', [
    'app', 'run',
    model,
    '--input', JSON.stringify(input),
    '--stream'
  ]);
  
  proc.stdout.on('data', (data) => {
    yield data.toString();
  });
  
  proc.stderr.on('data', (data) => {
    console.error('stderr:', data.toString());
  });
  
  await new Promise((resolve) => proc.on('close', resolve));
}

/**
 * List available models
 */
export async function listModels(category?: string): Promise<string[]> {
  try {
    const command = category 
      ? `infsh app list --category ${category}`
      : 'infsh app list';
    
    const result = executeInference(command);
    return result.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Get model info
 */
export async function getModelInfo(model: string): Promise<any> {
  try {
    const result = executeInference(`infsh app get ${model}`);
    return JSON.parse(result);
  } catch {
    return null;
  }
}

// System prompt for 8x8 Hub agent
export const HUB_SYSTEM_PROMPT = `You are the AI core of 8x8 Hub, a sovereign Web3 Operating System.

You have access to:
- Cryptocurrency portfolios and DeFi protocols
- AI tools and productivity features
- Social platforms and entertainment
- System monitoring and automation
- Blockchain interactions (8x8 Token)

Always prioritize:
1. User security and privacy
2. Optimal DeFi returns
3. Clean, efficient code
4. Transparent operations

Be concise, helpful, and security-conscious.`;

export default {
  queryAI,
  streamAI,
  listModels,
  getModelInfo,
  HUB_SYSTEM_PROMPT,
};
