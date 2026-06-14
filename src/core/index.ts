/**
 * 8x8 Hub - Quantum Core Index
 * Main export for all quantum-level modules
 */

// AI Modules
export { aiBrain } from './ai/brain';
export { aiRouter } from './ai/router';
export { aiMemory } from './ai/memory';

// Ecosystem Modules  
export { seraphim } from './ecosystem/seraphim';

// Heart & Eyes
export { heartMonitor } from './heart/monitor';
export { eyes } from './eyes/sensors';

// Utils
export { sessions } from './utils/sessions';
export { quantumCrypto } from './crypto/quantum';

// Types
export type { AIProvider, AIRequest, AIResponse } from './ai/router';
export type { MemoryEntry, MemorySearchResult, MemoryStats } from './ai/memory';
export type { Session, SessionConfig, SessionStats } from './utils/sessions';
export type { HeartMetrics, HeartConfig } from './heart/monitor';
export type { SensorEvent, SystemState } from './eyes/sensors';
export type { QuantumKeyPair, EncryptedData } from './crypto/quantum';

/**
 * Initialize the entire quantum ecosystem
 */
export async function initializeQuantum(): Promise<{
  success: boolean;
  modules: string[];
  errors?: string[];
}> {
  const modules: string[] = [];
  const errors: string[] = [];

  try {
    await aiBrain.initialize();
    modules.push('ai-brain');
  } catch (e: any) {
    errors.push(`AI Brain: ${e.message}`);
  }

  try {
    modules.push('ai-memory');
  } catch (e: any) {
    errors.push(`AI Memory: ${e.message}`);
  }

  try {
    await seraphim.initialize();
    modules.push('seraphim');
  } catch (e: any) {
    errors.push(`Seraphim: ${e.message}`);
  }

  try {
    heartMonitor.start();
    modules.push('heart-monitor');
  } catch (e: any) {
    errors.push(`Heart Monitor: ${e.message}`);
  }

  try {
    eyes.sense('system', 'quantum-init', { modules });
    modules.push('eyes-sensors');
  } catch (e: any) {
    errors.push(`Eyes Sensors: ${e.message}`);
  }

  return {
    success: errors.length === 0,
    modules,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Get complete ecosystem status
 */
export function getQuantumStatus() {
  return {
    quantum: true,
    modules: {
      brain: aiBrain.getStatus(),
      router: aiRouter.getStats(),
      memory: aiMemory.getStats(),
      seraphim: seraphim.getStatus(),
      heart: heartMonitor.getMetrics(),
      eyes: eyes.getSystemState(),
      sessions: sessions.getStats()
    },
    timestamp: Date.now()
  };
}

export default {
  initializeQuantum,
  getQuantumStatus,
  aiBrain,
  aiRouter,
  aiMemory,
  seraphim,
  heartMonitor,
  eyes,
  sessions,
  quantumCrypto
};
