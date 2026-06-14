/**
 * Plugin Manager Service
 * Handles plugin registration, installation, removal, sandboxing, and hooks
 */

import { EventEmitter } from 'events';

// Plugin manifest interface
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  hooks: string[];
  permissions: string[];
  sandboxed: boolean;
}

// Plugin instance interface
export interface PluginInstance extends PluginManifest {
  installedAt: number;
  status: 'active' | 'disabled' | 'error';
  lastError?: string;
}

// Hook handler type
type HookHandler = (data?: unknown) => Promise<void> | void;

// Sandbox context for isolated execution
interface SandboxContext {
  pluginId: string;
  permissions: string[];
  maxMemory?: number;
  maxCpu?: number;
  allowedAPIs: string[];
}

// Available hooks in the system
export const SYSTEM_HOOKS = [
  'onDashboardLoad',
  'onPriceUpdate',
  'onWalletChange',
  'onTradeExecute',
  'onNFTMint',
  'onStakingUpdate',
  'onNotification',
  'onError',
  'onShutdown',
] as const;

export type SystemHook = typeof SYSTEM_HOOKS[number];

/**
 * Plugin Manager Class
 * Central service for managing plugins lifecycle
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private hookHandlers: Map<string, Map<string, HookHandler>> = new Map();
  private sandboxes: Map<string, SandboxContext> = new Map();
  
  // Default permissions that can be granted
  private readonly DEFAULT_PERMISSIONS = [
    'storage',
    'notifications',
    'charts',
    'api',
  ];
  
  // Dangerous permissions requiring explicit user consent
  private readonly RESTRICTED_PERMISSIONS = [
    'trading',
    'wallet',
    'admin',
  ];

  constructor() {
    super();
    this.initializeHookMap();
  }

  private initializeHookMap(): void {
    SYSTEM_HOOKS.forEach(hook => {
      this.hookHandlers.set(hook, new Map());
    });
  }

  /**
   * Register a new plugin
   */
  registerPlugin(manifest: PluginManifest): void {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already registered`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    const instance: PluginInstance = {
      ...manifest,
      installedAt: Date.now(),
      status: 'active',
    };

    this.plugins.set(manifest.id, instance);
    
    // Set up sandbox if required
    if (manifest.sandboxed) {
      this.createSandbox(manifest.id, manifest.permissions);
    }

    // Register hooks
    this.registerPluginHooks(manifest.id, manifest.hooks);

    console.log(`[PluginManager] Registered plugin: ${manifest.name} (${manifest.id})`);
    this.emit('plugin:registered', instance);
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new Error('Invalid plugin ID');
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error('Invalid plugin name');
    }
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error('Invalid version format (expected semver)');
    }
    if (!Array.isArray(manifest.hooks)) {
      throw new Error('Hooks must be an array');
    }
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('Permissions must be an array');
    }
    
    // Validate hook names
    for (const hook of manifest.hooks) {
      if (!SYSTEM_HOOKS.includes(hook as SystemHook)) {
        console.warn(`[PluginManager] Unknown hook: ${hook} in plugin ${manifest.id}`);
      }
    }
  }

  /**
   * Create sandbox environment for plugin
   */
  private createSandbox(pluginId: string, permissions: string[]): void {
    const context: SandboxContext = {
      pluginId,
      permissions,
      allowedAPIs: this.getAllowedAPIs(permissions),
    };

    this.sandboxes.set(pluginId, context);
    console.log(`[PluginManager] Created sandbox for plugin: ${pluginId}`);
  }

  /**
   * Get allowed APIs based on permissions
   */
  private getAllowedAPIs(permissions: string[]): string[] {
    const apiMap: Record<string, string[]> = {
      storage: ['localStorage', 'indexedDB'],
      notifications: ['Notification'],
      charts: ['recharts', 'chart.js'],
      api: ['fetch', 'XMLHttpRequest'],
      trading: ['exchangeAPI'],
      wallet: ['walletAPI'],
    };

    const allowed: string[] = [];
    for (const perm of permissions) {
      if (apiMap[perm]) {
        allowed.push(...apiMap[perm]);
      }
    }
    return allowed;
  }

  /**
   * Install a plugin (client-side persistence handled separately)
   */
  installPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.status = 'active';
    this.emit('plugin:installed', plugin);
    console.log(`[PluginManager] Installed plugin: ${plugin.name}`);
  }

  /**
   * Remove/uninstall a plugin
   */
  uninstallPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Remove all hook handlers for this plugin
    this.removePluginHooks(pluginId);

    // Destroy sandbox
    this.sandboxes.delete(pluginId);

    // Remove plugin
    this.plugins.delete(pluginId);

    this.emit('plugin:uninstalled', { id: pluginId, name: plugin.name });
    console.log(`[PluginManager] Uninstalled plugin: ${plugin.name}`);
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.status = 'disabled';
    this.removePluginHooks(pluginId);
    this.emit('plugin:disabled', plugin);
    console.log(`[PluginManager] Disabled plugin: ${plugin.name}`);
  }

  /**
   * Enable a disabled plugin
   */
  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.status = 'active';
    this.registerPluginHooks(pluginId, plugin.hooks);
    this.emit('plugin:enabled', plugin);
    console.log(`[PluginManager] Enabled plugin: ${plugin.name}`);
  }

  /**
   * Register hook handlers for a plugin
   */
  private registerPluginHooks(pluginId: string, hooks: string[]): void {
    for (const hookName of hooks) {
      const hookMap = this.hookHandlers.get(hookName);
      if (hookMap) {
        // Create wrapped handler with sandbox check
        const wrappedHandler: HookHandler = async (data?: unknown) => {
          const sandbox = this.sandboxes.get(pluginId);
          if (sandbox) {
            await this.executeInSandbox(pluginId, hookName, data);
          } else {
            console.log(`[PluginManager] Executing hook ${hookName} for plugin ${pluginId}`);
          }
        };
        
        hookMap.set(pluginId, wrappedHandler);
        console.log(`[PluginManager] Registered hook: ${hookName} for plugin ${pluginId}`);
      }
    }
  }

  /**
   * Remove all hooks for a plugin
   */
  private removePluginHooks(pluginId: string): void {
    for (const [hookName, handlers] of this.hookHandlers) {
      if (handlers.has(pluginId)) {
        handlers.delete(pluginId);
        console.log(`[PluginManager] Removed hook: ${hookName} for plugin ${pluginId}`);
      }
    }
  }

  /**
   * Execute a hook with all registered handlers
   */
  async executeHook(hookName: string, data?: unknown): Promise<void> {
    const handlers = this.hookHandlers.get(hookName);
    if (!handlers || handlers.size === 0) {
      return;
    }

    console.log(`[PluginManager] Executing hook: ${hookName} (${handlers.size} handlers)`);

    const promises: Promise<void>[] = [];
    for (const [pluginId, handler] of handlers) {
      const plugin = this.plugins.get(pluginId);
      if (plugin?.status !== 'active') {
        continue;
      }

      promises.push(
        handler(data).catch(error => {
          console.error(`[PluginManager] Hook ${hookName} error in plugin ${pluginId}:`, error);
          plugin.status = 'error';
          plugin.lastError = String(error);
          this.emit('plugin:error', { plugin, error });
        })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Execute in sandbox (isolated context)
   */
  private async executeInSandbox(pluginId: string, hookName: string, data?: unknown): Promise<void> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      return;
    }

    console.log(`[PluginManager] Sandbox execution: ${hookName} for ${pluginId}`);
    
    // In a real implementation, this would use a proper sandboxing solution
    // like isolated VM, Web Workers, or iframe sandboxing
    // For now, we log the sandbox context
    console.log(`[PluginManager] Sandbox context:`, {
      pluginId: sandbox.pluginId,
      allowedAPIs: sandbox.allowedAPIs,
      permissions: sandbox.permissions,
    });
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get installed (active) plugins
   */
  getInstalledPlugins(): PluginInstance[] {
    return this.getPlugins().filter(p => p.status === 'active');
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugins by category
   */
  getPluginsByHook(hookName: string): PluginInstance[] {
    const handlers = this.hookHandlers.get(hookName);
    if (!handlers) {
      return [];
    }

    const pluginIds = Array.from(handlers.keys());
    return pluginIds
      .map(id => this.plugins.get(id))
      .filter((p): p is PluginInstance => p !== undefined && p.status === 'active');
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: string, permission: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (this.DEFAULT_PERMISSIONS.includes(permission)) {
      return true;
    }

    if (this.RESTRICTED_PERMISSIONS.includes(permission)) {
      return plugin.permissions.includes(permission);
    }

    return plugin.permissions.includes(permission);
  }

  /**
   * Get plugin sandbox info
   */
  getSandboxInfo(pluginId: string): SandboxContext | undefined {
    return this.sandboxes.get(pluginId);
  }

  /**
   * Get available hooks
   */
  getAvailableHooks(): string[] {
    return [...SYSTEM_HOOKS];
  }

  /**
   * Get manager stats
   */
  getStats(): {
    totalPlugins: number;
    activePlugins: number;
    disabledPlugins: number;
    errorPlugins: number;
    totalHooks: number;
    sandboxedPlugins: number;
  } {
    const plugins = this.getPlugins();
    return {
      totalPlugins: plugins.length,
      activePlugins: plugins.filter(p => p.status === 'active').length,
      disabledPlugins: plugins.filter(p => p.status === 'disabled').length,
      errorPlugins: plugins.filter(p => p.status === 'error').length,
      totalHooks: Array.from(this.hookHandlers.values()).reduce((sum, h) => sum + h.size, 0),
      sandboxedPlugins: this.sandboxes.size,
    };
  }
}

// Singleton instance
export const pluginManager = new PluginManager();

// Register default plugins (can be extended)
export function registerDefaultPlugins(): void {
  pluginManager.registerPlugin({
    id: 'price-alert',
    name: 'Price Alert',
    version: '1.0.0',
    description: 'Get notified when crypto prices hit your targets',
    author: '8x8 Hub',
    entryPoint: '/plugins/PriceAlert.tsx',
    hooks: ['onPriceUpdate', 'onDashboardLoad'],
    permissions: ['notifications', 'storage'],
    sandboxed: true,
  });

  pluginManager.registerPlugin({
    id: 'portfolio-tracker',
    name: 'Portfolio Tracker',
    version: '1.0.0',
    description: 'Track your crypto portfolio performance',
    author: '8x8 Hub',
    entryPoint: '/plugins/PortfolioTracker.tsx',
    hooks: ['onDashboardLoad', 'onPriceUpdate'],
    permissions: ['storage', 'charts'],
    sandboxed: true,
  });

  console.log('[PluginManager] Default plugins registered');
}

export default pluginManager;
