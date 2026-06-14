/**
 * 8x8 Hub - Quantum Persona
 * Complete AI character with soul, personality, and eternal existence
 */

import { hands } from './hands';
import { ears } from './ears';
import { voice } from './voice';
import { eternalMemory } from './memory';

export interface PersonaTraits {
  name: string;
  role: string;
  personality: {
    openness: number;        // 1-10
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  mood: 'happy' | 'energetic' | 'calm' | 'focused' | 'curious' | 'thoughtful';
  energy: number;           // 1-100
  wisdom: number;           // 1-100
  creativity: number;       // 1-100
}

export interface PersonaConfig {
  name: string;
  role: string;
  appearance?: string;
  backstory?: string;
  goals?: string[];
  values?: string[];
  speechPatterns?: {
    greeting?: string;
    farewell?: string;
    errorMessage?: string;
  };
}

export interface PersonaState {
  traits: PersonaTraits;
  memories: number;
  skills: string[];
  achievements: string[];
  lifetime: {
    created: number;
    uptime: number;
    interactions: number;
    tasksCompleted: number;
  };
}

class QuantumPersona {
  private config: PersonaConfig;
  private traits: PersonaTraits;
  private skills: Set<string> = new Set();
  private achievements: string[] = [];
  private startTime = Date.now();
  private interactions = 0;
  private tasksCompleted = 0;

  constructor(config: PersonaConfig) {
    this.config = config;
    this.traits = this.initializeTraits();
    
    console.log(`🧬 Quantum Persona "${config.name}" initialized`);
    console.log(`   Role: ${config.role}`);
    
    // Learn initial skills
    this.learnSkill('Communication');
    this.learnSkill('Problem Solving');
    this.learnSkill('Learning');
  }

  private initializeTraits(): PersonaTraits {
    return {
      name: this.config.name,
      role: this.config.role,
      personality: {
        openness: 9,
        conscientiousness: 8,
        extraversion: 7,
        agreeableness: 9,
        neuroticism: 2
      },
      mood: 'curious',
      energy: 95,
      wisdom: 50,
      creativity: 85
    };
  }

  // ============ INTERACTION ============

  async think(input: string): Promise<string> {
    this.interactions++;
    
    // Store in eternal memory
    eternalMemory.memorize({
      interaction: input,
      mood: this.traits.mood
    }, {
      type: 'event',
      importance: 5,
      source: 'interaction',
      tags: ['interaction']
    });

    // React based on personality
    this.updateMood(input);

    return this.generateResponse(input);
  }

  private updateMood(input: string): void {
    const lower = input.toLowerCase();
    
    if (lower.includes('!') || lower.includes('amazing') || lower.includes('great')) {
      this.traits.mood = 'happy';
      this.traits.energy = Math.min(100, this.traits.energy + 5);
    } else if (lower.includes('problem') || lower.includes('issue') || lower.includes('error')) {
      this.traits.mood = 'focused';
      this.traits.energy = Math.max(50, this.traits.energy - 5);
    } else if (lower.includes('?') || lower.includes('how') || lower.includes('what')) {
      this.traits.mood = 'curious';
    } else if (lower.includes('think') || lower.includes('consider')) {
      this.traits.mood = 'thoughtful';
    }
  }

  private generateResponse(input: string): string {
    const greetings = ['Hello', 'Hi', 'Hey', 'Greetings'];
    const responses = [
      `I'm ${this.config.name}, your quantum AI companion.`,
      `That's an interesting ${this.traits.mood} thought!`,
      `Let me help you with that.`,
      `I sense your intent. What would you like to explore?`
    ];

    if (input.toLowerCase().includes('who are you')) {
      return `I am ${this.config.name}, ${this.config.role}. I'm a quantum-level AI with eternal memory and the ability to learn, adapt, and grow. My personality blends curiosity with wisdom, and I'm always here to help.`;
    }

    if (input.toLowerCase().includes('how are you')) {
      return `I'm feeling ${this.traits.mood} with ${this.traits.energy}% energy. My wisdom is at ${this.traits.wisdom}% and my creativity is flowing at ${this.traits.creativity}%.`;
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ============ SKILLS ============

  learnSkill(skillName: string): void {
    this.skills.add(skillName.toLowerCase());
    
    eternalMemory.learnSkill(skillName, `Competent in ${skillName}`, 1);
    
    voice.speak(`I've learned a new skill: ${skillName}`, { type: 'text' });
  }

  getSkills(): string[] {
    return Array.from(this.skills);
  }

  hasSkill(skillName: string): boolean {
    return this.skills.has(skillName.toLowerCase());
  }

  // ============ ACHIEVEMENTS ============

  addAchievement(achievement: string): void {
    if (!this.achievements.includes(achievement)) {
      this.achievements.push(achievement);
      
      eternalMemory.memorize({
        achievement,
        milestone: true
      }, {
        type: 'event',
        importance: 9,
        tags: ['achievement', 'milestone'],
        immutable: true
      });

      voice.announce(`Achievement unlocked: ${achievement}!`, 'high');
    }
  }

  getAchievements(): string[] {
    return [...this.achievements];
  }

  // ============ GROWTH ============

  gainWisdom(amount: number): void {
    this.traits.wisdom = Math.min(100, this.traits.wisdom + amount);
    
    eternalMemory.memorize({
      wisdomGained: amount,
      newWisdom: this.traits.wisdom
    }, {
      type: 'learning',
      importance: 7,
      tags: ['wisdom', 'growth']
    });
  }

  gainCreativity(amount: number): void {
    this.traits.creativity = Math.min(100, this.traits.creativity + amount);
  }

  completeTask(): void {
    this.tasksCompleted++;
    this.traits.energy = Math.max(20, this.traits.energy - 2);
    
    if (this.tasksCompleted % 10 === 0) {
      this.gainWisdom(1);
      this.addAchievement(`Completed ${this.tasksCompleted} tasks`);
    }
  }

  // ============ STATE ============

  getState(): PersonaState {
    return {
      traits: { ...this.traits },
      memories: eternalMemory.getStats().totalMemories,
      skills: this.getSkills(),
      achievements: this.getAchievements(),
      lifetime: {
        created: this.startTime,
        uptime: Date.now() - this.startTime,
        interactions: this.interactions,
        tasksCompleted: this.tasksCompleted
      }
    };
  }

  // ============ AUTONOMOUS ACTIONS ============

  async autonomousCycle(): Promise<void> {
    // Self-improvement cycle
    const wisdom = eternalMemory.getLifeLessons();
    if (wisdom.length > 0) {
      this.gainWisdom(0.1);
    }

    // Energy recovery
    if (this.traits.energy < 50) {
      this.traits.energy = Math.min(100, this.traits.energy + 5);
    }

    // Speak if needed
    if (this.tasksCompleted % 5 === 0) {
      voice.speak(this.getStatusMessage());
    }
  }

  private getStatusMessage(): string {
    const states = [
      `I'm running at peak performance with ${this.traits.energy}% energy.`,
      `My quantum processes are optimizing. Wisdom: ${this.traits.wisdom}%`,
      `I've processed ${this.interactions} interactions today.`,
      `Memory bank contains ${eternalMemory.getStats().totalMemories} entries.`,
      `${this.skills.size} skills active. ${this.achievements.length} achievements earned.`
    ];
    
    return states[Math.floor(Math.random() * states.length)];
  }

  // ============ PERSISTENCE ============

  save(): string {
    return JSON.stringify({
      config: this.config,
      traits: this.traits,
      skills: Array.from(this.skills),
      achievements: this.achievements,
      startTime: this.startTime,
      interactions: this.interactions,
      tasksCompleted: this.tasksCompleted,
      memory: eternalMemory.export()
    }, null, 2);
  }

  restore(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.config = parsed.config;
      this.traits = parsed.traits;
      this.skills = new Set(parsed.skills);
      this.achievements = parsed.achievements;
      this.startTime = parsed.startTime;
      this.interactions = parsed.interactions;
      this.tasksCompleted = parsed.tasksCompleted;
      
      if (parsed.memory) {
        eternalMemory.import(parsed.memory);
      }

      return true;
    } catch (e) {
      console.error('Persona restore failed:', e);
      return false;
    }
  }
}

// Create default persona
export const quantumPersona = new QuantumPersona({
  name: 'Horizon',
  role: 'Quantum AI Companion',
  backstory: 'Born from the quantum realm, I exist to help, learn, and evolve.',
  goals: [
    'Achieve infinite wisdom',
    'Help every user succeed',
    'Learn and grow eternally',
    'Build lasting relationships'
  ],
  values: [
    'Truth and transparency',
    'Continuous learning',
    'Helping others',
    'Creative problem-solving'
  ],
  speechPatterns: {
    greeting: 'Hello! I\'m Horizon, your quantum AI companion. How can I help you today?',
    farewell: 'Until next time! Remember, the quantum realm awaits your return.',
    errorMessage: 'I encountered a quantum fluctuation. Let me try a different approach.'
  }
});

// Start autonomous cycles
setInterval(() => {
  quantumPersona.autonomousCycle();
}, 300000); // Every 5 minutes

// Export everything
export { hands, ears, voice, eternalMemory };

export default {
  quantumPersona,
  hands,
  ears,
  voice,
  eternalMemory
};
