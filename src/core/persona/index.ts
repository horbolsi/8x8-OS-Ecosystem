/**
 * 8x8 Hub - Complete Persona System Index
 * Exporting all user and persona modules
 */

export { hands } from './hands';
export { ears } from './ears';
export { voice } from './voice';
export { eternalMemory } from './memory';
export { quantumPersona } from './quantum';
export { userPersonas, createOwnerPersona } from './user-persona';
export { ownerJourney } from './owner-journey';

// Re-export types
export type { ExecutionResult, FileOperation, ActionCapability } from './hands';
export type { Listener, InputSource, AudioInput } from './ears';
export type { VoiceMessage, VoiceChannel, VoiceConfig } from './voice';
export type { MemoryEntry, MemoryQuery, MemoryCluster } from './memory';
export type { PersonaTraits, PersonaConfig, PersonaState } from './quantum';
export type { 
  UserPersona, 
  CompanionAI, 
  UserRole, 
  Permission, 
  UserStats, 
  Achievement, 
  JourneyMilestone, 
  UserPreferences 
} from './user-persona';
export type { JourneyStep } from './owner-journey';

/**
 * Initialize the complete quantum persona system
 */
export async function initializePersona(): Promise<{
  success: boolean;
  components: string[];
}> {
  const components: string[] = [];

  // Hands - execution
  components.push('hands');
  
  // Ears - listening
  components.push('ears');
  
  // Voice - speaking
  components.push('voice');
  
  // Memory - eternal storage
  components.push('eternal-memory');
  
  // Persona - AI character
  components.push('quantum-persona');
  
  // User Personas - user accounts
  components.push('user-personas');

  console.log('🧬 Quantum Persona System initialized');
  console.log(`   Components: ${components.join(', ')}`);

  return {
    success: true,
    components
  };
}

/**
 * Initialize owner account
 */
export async function initializeOwner(name: string = 'Owner'): Promise<UserPersona> {
  // Check if owner exists
  const existingOwner = userPersonas.getOwner();
  if (existingOwner) {
    console.log(`👑 Owner already exists: ${existingOwner.name}`);
    return existingOwner;
  }

  // Create new owner
  const owner = createOwnerPersona(name);
  console.log(`👑 Owner created: ${owner.name}`);
  console.log(`   Title: ${owner.title}`);
  console.log(`   Roles: ${owner.roles.map(r => r.icon + ' ' + r.name).join(', ')}`);
  
  return owner;
}

/**
 * Get complete system status
 */
export function getPersonaStatus() {
  const owner = userPersonas.getOwner();
  
  return {
    system: {
      hands: hands.getStats(),
      ears: ears.getStats(),
      voice: voice.getStats(),
      memory: eternalMemory.getStats(),
      persona: quantumPersona.getState()
    },
    users: {
      total: 0, // Would count from storage
      owner: owner ? {
        id: owner.id,
        name: owner.name,
        title: owner.title,
        level: owner.level,
        xp: owner.xp
      } : null
    },
    quantum: {
      ready: true,
      modules: 7,
      version: '1.0.0-quantum'
    }
  };
}

/**
 * Run owner journey test
 */
export async function testOwnerJourney(): Promise<any> {
  console.log('🧪 Starting Owner Journey Test...');
  return ownerJourney.runFullJourney();
}

export default {
  initializePersona,
  initializeOwner,
  getPersonaStatus,
  testOwnerJourney,
  hands,
  ears,
  voice,
  eternalMemory,
  quantumPersona,
  userPersonas,
  ownerJourney
};
