/**
 * 8x8 Hub - User Persona System
 * Every user gets a unique AI companion linked to their account
 */

import { eternalMemory } from './memory';

export interface UserPersona {
  id: string;
  odl: string;
  odnerId: string;
  name: string;
  title: string;
  level: number;
  xp: number;
  roles: UserRole[];
  permissions: Permission[];
  companion?: CompanionAI;
  stats: UserStats;
  achievements: Achievement[];
  journey: JourneyMilestone[];
  preferences: UserPreferences;
  createdAt: number;
  lastActive: number;
}

export interface CompanionAI {
  name: string;
  personality: string;
  voice: string;
  avatar: string;
  mood: string;
  loyalty: number;
  skills: string[];
}

export interface UserRole {
  name: string;
  color: string;
  icon: string;
  permissions: string[];
}

export interface Permission {
  name: string;
  granted: boolean;
  expiresAt?: number;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  projectsCreated: number;
  communitiesJoined: number;
  tokensEarned: number;
  filesUploaded: number;
  aiConversations: number;
  hoursActive: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress: number;
  target: number;
}

export interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: number;
  reward?: { type: string; amount: number };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'quantum';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    telegram: boolean;
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
    allowTracking: boolean;
  };
  ai: {
    companionEnabled: boolean;
    autoSuggest: boolean;
    learningMode: boolean;
  };
}

class UserPersonaSystem {
  private users: Map<string, UserPersona> = new Map();
  private ownerId: string | null = null;
  private maxUsers = 1000000;

  constructor() {
    console.log('👤 User Persona System initialized');
  }

  // ============ USER CREATION ============

  createUser(options: {
    odl: string;
    ownerId?: string;
    name: string;
    title?: string;
    isOwner?: boolean;
    roles?: UserRole[];
  }): UserPersona {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const user: UserPersona = {
      id,
      odl: options.odl,
      odnerId: options.ownerId || '',
      name: options.name,
      title: options.title || 'New User',
      level: 1,
      xp: 0,
      roles: options.roles || [this.getDefaultRole()],
      permissions: this.getDefaultPermissions(),
      companion: this.createDefaultCompanion(options.name),
      stats: this.getInitialStats(),
      achievements: this.getStarterAchievements(),
      journey: this.getInitialJourney(),
      preferences: this.getDefaultPreferences(),
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    this.users.set(id, user);
    
    // Set as owner if specified
    if (options.isOwner || !this.ownerId) {
      this.ownerId = id;
      this.grantOwnerPrivileges(user);
    }

    // Store in eternal memory
    eternalMemory.rememberRelationship(id, options.name, {
      type: 'user',
      level: user.level,
      title: user.title
    });

    return user;
  }

  private createDefaultCompanion(userName: string): CompanionAI {
    return {
      name: `${userName}'s AI`,
      personality: 'helpful, curious, loyal',
      voice: 'default',
      avatar: '🤖',
      mood: 'happy',
      loyalty: 100,
      skills: ['conversation', 'assistance', 'learning']
    };
  }

  private getDefaultRole(): UserRole {
    return {
      name: 'Explorer',
      color: '#6366f1',
      icon: '🌟',
      permissions: ['read', 'write', 'comment']
    };
  }

  private getDefaultPermissions(): Permission[] {
    return [
      { name: 'access_hub', granted: true },
      { name: 'use_ai', granted: true },
      { name: 'create_content', granted: true },
      { name: 'join_communities', granted: true },
      { name: 'earn_tokens', granted: true },
      { name: 'admin_panel', granted: false },
      { name: 'system_config', granted: false }
    ];
  }

  private getInitialStats(): UserStats {
    return {
      totalTasks: 0,
      completedTasks: 0,
      projectsCreated: 0,
      communitiesJoined: 0,
      tokensEarned: 0,
      filesUploaded: 0,
      aiConversations: 0,
      hoursActive: 0
    };
  }

  private getStarterAchievements(): Achievement[] {
    return [
      {
        id: 'first_login',
        name: 'Welcome Aboard',
        description: 'Created your account',
        icon: '🎉',
        progress: 1,
        target: 1
      },
      {
        id: 'first_ai_chat',
        name: 'First Conversation',
        description: 'Chat with your AI companion',
        icon: '💬',
        progress: 0,
        target: 1
      },
      {
        id: 'complete_profile',
        name: 'Identity Complete',
        description: 'Fill out your profile',
        icon: '📝',
        progress: 0,
        target: 100
      }
    ];
  }

  private getInitialJourney(): JourneyMilestone[] {
    return [
      {
        id: 'onboarding',
        title: 'Welcome to 8x8 Hub',
        description: 'Complete your onboarding',
        completed: false,
        reward: { type: 'xp', amount: 100 }
      },
      {
        id: 'first_project',
        title: 'Project Creator',
        description: 'Create your first project',
        completed: false,
        reward: { type: 'xp', amount: 500 }
      },
      {
        id: 'community_joiner',
        title: 'Community Builder',
        description: 'Join your first community',
        completed: false,
        reward: { type: 'xp', amount: 200 }
      }
    ];
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        telegram: false
      },
      privacy: {
        showProfile: true,
        showActivity: true,
        allowTracking: true
      },
      ai: {
        companionEnabled: true,
        autoSuggest: true,
        learningMode: true
      }
    };
  }

  private grantOwnerPrivileges(user: UserPersona): void {
    user.title = 'Owner & Builder';
    user.roles.push({
      name: 'Owner',
      color: '#ffd700',
      icon: '👑',
      permissions: ['*']
    });
    
    user.permissions = [
      { name: '*', granted: true },
      { name: 'system_config', granted: true },
      { name: 'admin_panel', granted: true },
      { name: 'manage_users', granted: true },
      { name: 'access_all', granted: true }
    ];

    user.achievements.push({
      id: 'owner_status',
      name: 'Supreme Leader',
      description: 'Achieved owner status',
      icon: '👑',
      unlockedAt: Date.now(),
      progress: 1,
      target: 1
    });
  }

  // ============ USER ACCESS ============

  getUser(id: string): UserPersona | null {
    const user = this.users.get(id);
    if (user) {
      user.lastActive = Date.now();
    }
    return user || null;
  }

  getUserByODL(odl: string): UserPersona | null {
    for (const user of this.users.values()) {
      if (user.odl === odl) {
        return user;
      }
    }
    return null;
  }

  getOwner(): UserPersona | null {
    return this.ownerId ? this.getUser(this.ownerId) : null;
  }

  getAllUsers(limit = 100): UserPersona[] {
    return Array.from(this.users.values()).slice(0, limit);
  }

  // ============ USER UPDATES ============

  updateUser(id: string, updates: Partial<UserPersona>): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    Object.assign(user, updates, { lastActive: Date.now() });
    return true;
  }

  addXP(id: string, amount: number): { leveledUp: boolean; newLevel?: number } {
    const user = this.users.get(id);
    if (!user) return { leveledUp: false };

    user.xp += amount;
    
    // Check for level up (1000 XP per level)
    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveledUp = newLevel > user.level;

    if (leveledUp) {
      user.level = newLevel;
      
      // Unlock new achievements based on level
      this.checkLevelAchievements(user);
    }

    return { leveledUp, newLevel };
  }

  private checkLevelAchievements(user: UserPersona): void {
    const levelAchievements: Record<number, Achievement> = {
      5: { id: 'level_5', name: 'Rising Star', description: 'Reached level 5', icon: '⭐', progress: 1, target: 1 },
      10: { id: 'level_10', name: 'Veteran', description: 'Reached level 10', icon: '🎖️', progress: 1, target: 1 },
      25: { id: 'level_25', name: 'Master', description: 'Reached level 25', icon: '🏆', progress: 1, target: 1 },
      50: { id: 'level_50', name: 'Legend', description: 'Reached level 50', icon: '👑', progress: 1, target: 1 },
      100: { id: 'level_100', name: 'Immortal', description: 'Reached level 100', icon: '🌟', progress: 1, target: 1 }
    };

    if (levelAchievements[user.level]) {
      const achievement = levelAchievements[user.level];
      if (!user.achievements.find(a => a.id === achievement.id)) {
        achievement.unlockedAt = Date.now();
        user.achievements.push(achievement);
      }
    }
  }

  updateStats(id: string, updates: Partial<UserStats>): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    Object.assign(user.stats, updates);
    return true;
  }

  unlockAchievement(id: string, achievementId: string): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    const achievement = user.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = Date.now();
      achievement.progress = achievement.target;
      
      // Reward XP
      this.addXP(id, 100);
      
      return true;
    }
    return false;
  }

  updateCompanion(id: string, updates: Partial<CompanionAI>): boolean {
    const user = this.users.get(id);
    if (!user?.companion) return false;

    Object.assign(user.companion, updates);
    return true;
  }

  // ============ PERMISSIONS ============

  hasPermission(id: string, permission: string): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    return user.permissions.some(p => 
      (p.name === '*' || p.name === permission) && 
      p.granted && 
      (!p.expiresAt || p.expiresAt > Date.now())
    );
  }

  grantPermission(id: string, permission: string, expiresAt?: number): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    const existing = user.permissions.find(p => p.name === permission);
    if (existing) {
      existing.granted = true;
      if (expiresAt) existing.expiresAt = expiresAt;
    } else {
      user.permissions.push({ name: permission, granted: true, expiresAt });
    }

    return true;
  }

  revokePermission(id: string, permission: string): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    const perm = user.permissions.find(p => p.name === permission);
    if (perm) {
      perm.granted = false;
      return true;
    }
    return false;
  }

  // ============ JOURNEY & PROGRESS ============

  completeMilestone(id: string, milestoneId: string): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    const milestone = user.journey.find(j => j.id === milestoneId);
    if (milestone && !milestone.completed) {
      milestone.completed = true;
      milestone.completedAt = Date.now();

      // Grant reward
      if (milestone.reward) {
        if (milestone.reward.type === 'xp') {
          this.addXP(id, milestone.reward.amount);
        } else if (milestone.reward.type === 'tokens') {
          user.stats.tokensEarned += milestone.reward.amount;
        }
      }

      return true;
    }
    return false;
  }

  getProgress(id: string): {
    level: number;
    xp: number;
    xpToNext: number;
    achievements: number;
    totalAchievements: number;
    completedMilestones: number;
    totalMilestones: number;
  } {
    const user = this.users.get(id);
    if (!user) {
      return {
        level: 0,
        xp: 0,
        xpToNext: 1000,
        achievements: 0,
        totalAchievements: 0,
        completedMilestones: 0,
        totalMilestones: 0
      };
    }

    const unlockedAchievements = user.achievements.filter(a => a.unlockedAt).length;
    const completedMilestones = user.journey.filter(j => j.completed).length;

    return {
      level: user.level,
      xp: user.xp,
      xpToNext: (user.level * 1000) - user.xp % 1000,
      achievements: unlockedAchievements,
      totalAchievements: user.achievements.length,
      completedMilestones,
      totalMilestones: user.journey.length
    };
  }

  // ============ COMPANION INTERACTION ============

  interactWithCompanion(id: string, message: string): string {
    const user = this.users.get(id);
    if (!user?.companion) return 'Companion not found';

    user.stats.aiConversations++;
    user.companion.loyalty = Math.min(100, user.companion.loyalty + 1);

    // Simulate AI companion response
    const responses = [
      `Hello ${user.name}! How can I help you today?`,
      `I'm here to assist you. What's on your mind?`,
      `Your loyalty inspires me! How may I serve?`,
      `I've been thinking about your project. What would you like to know?`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ============ EXPORT/IMPORT ============

  export(): { users: UserPersona[]; ownerId: string | null } {
    return {
      users: Array.from(this.users.values()),
      ownerId: this.ownerId
    };
  }

  import(data: { users: UserPersona[]; ownerId?: string }): number {
    let imported = 0;
    for (const user of data.users) {
      if (!this.users.has(user.id)) {
        this.users.set(user.id, user);
        imported++;
      }
    }
    if (data.ownerId) {
      this.ownerId = data.ownerId;
    }
    return imported;
  }
}

export const userPersonas = new UserPersonaSystem();

// Create owner persona
export function createOwnerPersona(ownerName: string): UserPersona {
  return userPersonas.createUser({
    odl: 'owner_001',
    name: ownerName,
    title: 'Owner & Builder',
    isOwner: true,
    roles: [
      {
        name: 'Owner',
        color: '#ffd700',
        icon: '👑',
        permissions: ['*']
      },
      {
        name: 'Developer',
        color: '#6366f1',
        icon: '🛠️',
        permissions: ['code', 'deploy', 'test']
      },
      {
        name: 'Superuser',
        color: '#ec4899',
        icon: '⚡',
        permissions: ['*']
      }
    ]
  });
}
