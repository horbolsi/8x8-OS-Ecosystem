/**
 * 8x8 Hub - Quantum Hands
 * Execution capabilities for autonomous actions
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode: number;
  timestamp: number;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'copy' | 'move' | 'list';
  path: string;
  content?: string;
  destination?: string;
}

export interface ActionCapability {
  name: string;
  enabled: boolean;
  requiresApproval: boolean;
  maxExecutions: number;
}

class QuantumHands {
  private capabilities: Map<string, ActionCapability> = new Map();
  private executionLog: Array<{action: string; result: ExecutionResult; timestamp: number}> = [];
  private maxLogEntries = 1000;

  constructor() {
    this.initializeCapabilities();
    console.log('✋ Quantum Hands initialized - Ready to execute');
  }

  private initializeCapabilities(): void {
    // File operations
    this.registerCapability('file:read', true, false, 100);
    this.registerCapability('file:write', true, true, 50);
    this.registerCapability('file:delete', true, true, 10);
    this.registerCapability('file:copy', true, true, 50);
    
    // Command execution
    this.registerCapability('exec:shell', true, true, 20);
    this.registerCapability('exec:system', true, true, 10);
    
    // API calls
    this.registerCapability('api:request', true, false, 200);
    
    // Database
    this.registerCapability('db:query', true, false, 100);
    this.registerCapability('db:write', true, true, 50);
    
    // Communication
    this.registerCapability('notify:telegram', true, false, 50);
    this.registerCapability('notify:email', true, false, 50);
  }

  private registerCapability(name: string, enabled: boolean, requiresApproval: boolean, maxExecutions: number): void {
    this.capabilities.set(name, { name, enabled, requiresApproval, maxExecutions });
  }

  // ============ FILE OPERATIONS ============

  async readFile(filePath: string): Promise<ExecutionResult> {
    const cap = this.capabilities.get('file:read');
    if (!cap?.enabled) {
      return { success: false, error: 'Capability disabled', exitCode: -1, timestamp: Date.now() };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.logAction('file:read', { success: true, output: content, exitCode: 0, timestamp: Date.now() });
      return { success: true, output: content, exitCode: 0, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('file:read', { success: false, error: error.message, exitCode: -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: -1, timestamp: Date.now() };
    }
  }

  async writeFile(filePath: string, content: string): Promise<ExecutionResult> {
    const cap = this.capabilities.get('file:write');
    if (!cap?.enabled) {
      return { success: false, error: 'Capability disabled', exitCode: -1, timestamp: Date.now() };
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
      this.logAction('file:write', { success: true, output: filePath, exitCode: 0, timestamp: Date.now() });
      return { success: true, output: `Written to ${filePath}`, exitCode: 0, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('file:write', { success: false, error: error.message, exitCode: -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: -1, timestamp: Date.now() };
    }
  }

  async deleteFile(filePath: string): Promise<ExecutionResult> {
    const cap = this.capabilities.get('file:delete');
    if (!cap?.enabled) {
      return { success: false, error: 'Capability disabled', exitCode: -1, timestamp: Date.now() };
    }

    try {
      fs.unlinkSync(filePath);
      this.logAction('file:delete', { success: true, output: filePath, exitCode: 0, timestamp: Date.now() });
      return { success: true, output: `Deleted ${filePath}`, exitCode: 0, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('file:delete', { success: false, error: error.message, exitCode: -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: -1, timestamp: Date.now() };
    }
  }

  async listDirectory(dirPath: string): Promise<ExecutionResult> {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const result = entries.map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
        path: path.join(dirPath, e.name)
      }));
      
      this.logAction('file:list', { success: true, output: JSON.stringify(result), exitCode: 0, timestamp: Date.now() });
      return { success: true, output: JSON.stringify(result, null, 2), exitCode: 0, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('file:list', { success: false, error: error.message, exitCode: -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: -1, timestamp: Date.now() };
    }
  }

  async copyFile(source: string, destination: string): Promise<ExecutionResult> {
    const cap = this.capabilities.get('file:copy');
    if (!cap?.enabled) {
      return { success: false, error: 'Capability disabled', exitCode: -1, timestamp: Date.now() };
    }

    try {
      fs.copyFileSync(source, destination);
      this.logAction('file:copy', { success: true, output: `${source} -> ${destination}`, exitCode: 0, timestamp: Date.now() });
      return { success: true, output: `Copied ${source} to ${destination}`, exitCode: 0, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('file:copy', { success: false, error: error.message, exitCode: -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: -1, timestamp: Date.now() };
    }
  }

  // ============ COMMAND EXECUTION ============

  async executeCommand(command: string, cwd?: string): Promise<ExecutionResult> {
    const cap = this.capabilities.get('exec:shell');
    if (!cap?.enabled) {
      return { success: false, error: 'Capability disabled', exitCode: -1, timestamp: Date.now() };
    }

    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: cwd || process.cwd(),
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });
      
      const output = stdout || stderr;
      this.logAction('exec:shell', { success: true, output, exitCode: 0, timestamp: Date.now() });
      return { success: true, output, exitCode: 0, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('exec:shell', { success: false, error: error.message, exitCode: error.code || -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: error.code || -1, timestamp: Date.now() };
    }
  }

  // ============ API REQUESTS ============

  async makeApiRequest(url: string, options?: RequestInit): Promise<ExecutionResult> {
    const cap = this.capabilities.get('api:request');
    if (!cap?.enabled) {
      return { success: false, error: 'Capability disabled', exitCode: -1, timestamp: Date.now() };
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      const data = await response.json();
      this.logAction('api:request', { success: true, output: JSON.stringify(data), exitCode: response.status, timestamp: Date.now() });
      return { success: response.ok, output: JSON.stringify(data), exitCode: response.status, timestamp: Date.now() };
    } catch (error: any) {
      this.logAction('api:request', { success: false, error: error.message, exitCode: -1, timestamp: Date.now() });
      return { success: false, error: error.message, exitCode: -1, timestamp: Date.now() };
    }
  }

  // ============ UTILITIES ============

  private logAction(action: string, result: ExecutionResult): void {
    this.executionLog.push({ action, result, timestamp: Date.now() });
    if (this.executionLog.length > this.maxLogEntries) {
      this.executionLog.shift();
    }
  }

  getExecutionLog(): Array<{action: string; result: ExecutionResult; timestamp: number}> {
    return [...this.executionLog];
  }

  getCapabilities(): ActionCapability[] {
    return Array.from(this.capabilities.values());
  }

  enableCapability(name: string): boolean {
    const cap = this.capabilities.get(name);
    if (cap) {
      cap.enabled = true;
      return true;
    }
    return false;
  }

  disableCapability(name: string): boolean {
    const cap = this.capabilities.get(name);
    if (cap) {
      cap.enabled = false;
      return true;
    }
    return false;
  }

  getStats(): { totalExecutions: number; successRate: number; capabilities: number } {
    const total = this.executionLog.length;
    const successful = this.executionLog.filter(e => e.result.success).length;
    return {
      totalExecutions: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      capabilities: this.capabilities.size
    };
  }
}

export const hands = new QuantumHands();
