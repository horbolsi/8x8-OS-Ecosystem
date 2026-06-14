/**
 * Role-Based Access Control (RBAC)
 * Permissions: can_manage_users, can_edit_trade, can_view_leaderboard, etc.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db';

// Permission definitions per role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    '*' // All permissions
  ],
  admin: [
    'can_manage_users',
    'can_edit_trade',
    'can_view_leaderboard',
    'can_manage_content',
    'can_view_analytics',
    'can_moderate'
  ],
  developer: [
    'can_view_leaderboard',
    'can_view_analytics',
    'can_manage_content'
  ],
  moderator: [
    'can_moderate',
    'can_view_leaderboard'
  ],
  user: [
    'can_view_leaderboard'
  ]
};

// Default permissions if role not found
const DEFAULT_PERMISSIONS: string[] = [];

export type Permission = 
  | 'can_manage_users'
  | 'can_edit_trade'
  | 'can_view_leaderboard'
  | 'can_manage_content'
  | 'can_view_analytics'
  | 'can_moderate'
  | 'can_access_admin'
  | 'can_deploy_contracts';

export interface UserPermissions {
  role: string;
  permissions: string[];
  badges: string[];
}

/**
 * Get user permissions from database
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  try {
    const { data: user } = await supabase
      .from('hub_users')
      .select('role, hub_badges(name)')
      .eq('id', userId)
      .single();

    if (!user) return null;

    const permissions = ROLE_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS;
    const badges = (user.hub_badges || []).map((b: any) => b.name);

    return {
      role: user.role || 'user',
      permissions,
      badges
    };
  } catch (error) {
    console.error('[RBAC] Error fetching permissions:', error);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userPerms: UserPermissions, permission: Permission): boolean {
  // Owner has all permissions
  if (userPerms.permissions.includes('*')) return true;
  return userPerms.permissions.includes(permission);
}

/**
 * Middleware: Check permission
 */
export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const userPerms = await getUserPermissions(userId);

    if (!userPerms) {
      res.status(403).json({ error: 'User not found.' });
      return;
    }

    if (!hasPermission(userPerms, permission)) {
      res.status(403).json({ 
        error: `Permission denied. Required: ${permission}`,
        role: userPerms.role
      });
      return;
    }

    // Attach permissions to request
    (req as any).userPermissions = userPerms;
    next();
  };
}

/**
 * Middleware: Require specific role
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const userPerms = await getUserPermissions(userId);

    if (!userPerms) {
      res.status(403).json({ error: 'User not found.' });
      return;
    }

    if (!roles.includes(userPerms.role)) {
      res.status(403).json({ 
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        current_role: userPerms.role
      });
      return;
    }

    (req as any).userPermissions = userPerms;
    next();
  };
}