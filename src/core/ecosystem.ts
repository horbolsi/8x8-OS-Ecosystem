/**
 * 8x8 Hub - Unified Ecosystem Core
 * Initializes and manages all ecosystem components
 */

import { aiBrain } from './ai/brain';
import { heartMonitor } from './heart/monitor';
import { eyes } from './eyes/sensors';
import { seraphim } from './ecosystem/seraphim';

export interface EcosystemConfig {
  primaryModel?: string;
  fallbackModels?: string[];
  heartInterval?: number;
  eyesEnabled?: boolean;
  seraphimEnabled?: boolean;
}

const DEFAULT_CONFIG: Required<EcosystemConfig> = {
  primaryModel: process.env.AI_MODEL || 'openrouter/qwen3-32b',
  fallbackModels: (process.env.AI_FALLBACK_MODELS || 'openrouter/claude-sonnet-4,openrouter/deepseek-chat-v3').split(','),
  heartInterval: 5000,
  eyesEnabled: true,
  seraphimEnabled: true,
};

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the entire 8x8 Hub ecosystem
 */
export async function initializeEcosystem(config: EcosystemConfig = {}): Promise<void> {
  if (isInitialized) {
    console.log('[Ecosystem] Already initialized');
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    
    console.log('═══════════════════════════════════════════════════');
    console.log('    🧠 8x8 HUB ECOSYSTEM - QUANTUM INITIALIZATION  ');
    console.log('═══════════════════════════════════════════════════');

    // Initialize AI Brain
    console.log('\n[1/4] Initializing AI Brain...');
    await aiBrain.initialize({
      primaryModel: cfg.primaryModel,
      fallbackModels: cfg.fallbackModels,
    });
    console.log(`      ✅ AI Brain ready (Model: ${cfg.primaryModel})`);

    // Initialize Heart Monitor
    console.log('\n[2/4] Starting Heart Monitor...');
    heartMonitor.start();
    console.log(`      ✅ Heart Monitor active (${cfg.heartInterval}ms pulse)`);

    // Initialize Eyes Sensors
    if (cfg.eyesEnabled) {
      console.log('\n[3/4] Activating Eyes Sensors...');
      eyes.start();
      console.log('      ✅ Eyes Sensors online');
    }

    // Initialize Seraphim Guide
    if (cfg.seraphimEnabled) {
      console.log('\n[4/4] Waking Seraphim...');
      await seraphim.initialize();
      console.log('      ✅ Seraphim is online');
    }

    isInitialized = true;
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('    ✨ ECOSYSTEM READY - ALL SYSTEMS ONLINE        ');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Access Dashboard: GET /api/ecosystem/status');
    console.log('💬 Chat with Seraphim: POST /api/ecosystem/chat');
    console.log('🫀 Vitals: GET /api/ecosystem/vitals');
    console.log('👁️ Sensors: GET /api/ecosystem/events');
    console.log('');
  })();

  return initializationPromise;
}

/**
 * Get ecosystem status summary
 */
export function getEcosystemStatus() {
  return {
    initialized: isInitialized,
    brain: aiBrain.getStatus(),
    vitals: heartMonitor.getVitalsArray(),
    sensors: eyes.getDashboard(),
    seraphim: seraphim.getStatus(),
    timestamp: Date.now(),
  };
}

/**
 * Shutdown the ecosystem gracefully
 */
export async function shutdownEcosystem(): Promise<void> {
  console.log('[Ecosystem] Shutting down...');
  
  heartMonitor.stop();
  eyes.stop();
  
  isInitialized = false;
  initializationPromise = null;
  
  console.log('[Ecosystem] Shutdown complete');
}

// Export all ecosystem components
export {
  aiBrain,
  heartMonitor,
  eyes,
  seraphim,
};

// Default export
export default {
  initialize: initializeEcosystem,
  status: getEcosystemStatus,
  shutdown: shutdownEcosystem,
  brain: aiBrain,
  heart: heartMonitor,
  eyes,
  seraphim,
};
