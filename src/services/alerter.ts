/**
 * Alerting Service for 8x8 Hub
 * Handles price alerts, system alerts, activity alerts, and notification delivery
 */

import { supabase } from '../server/db';

export type AlertType = 'price' | 'system' | 'activity';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'email' | 'telegram' | 'in_app';
export type AlertCondition = 'above' | 'below' | 'change_percent';

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  name: string;
  config: PriceAlertConfig | SystemAlertConfig | ActivityAlertConfig;
  channels: AlertChannel[];
  enabled: boolean;
  created_at: string;
}

export interface PriceAlertConfig {
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  currentPrice?: number;
}

export interface SystemAlertConfig {
  event: 'service_down' | 'error_spike' | 'server_overload' | 'api_failure';
  threshold?: number;
  window?: number; // minutes
}

export interface ActivityAlertConfig {
  event: 'new_proposal' | 'large_transfer' | 'proposal_vote' | 'nft_sale' | 'token_swap';
  threshold?: number; // for large_transfer, amount in USD
  target?: string; // specific proposal ID, wallet address, etc.
}

export interface AlertHistory {
  id: string;
  alert_id: string;
  triggered_at: string;
  message: string;
  severity: AlertSeverity;
  metadata?: Record<string, any>;
  read: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  telegram: boolean;
  inApp: boolean;
  quietHours?: { start: string; end: string };
  minSeverity?: AlertSeverity;
}

// Alert Management Functions

/**
 * Create a new alert
 */
export async function createAlert(
  userId: string,
  type: AlertType,
  name: string,
  config: PriceAlertConfig | SystemAlertConfig | ActivityAlertConfig,
  channels: AlertChannel[]
): Promise<Alert> {
  const { data, error } = await supabase
    .from('user_alerts')
    .insert({
      user_id: userId,
      type,
      name,
      config: JSON.stringify(config),
      channels,
      enabled: true
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create alert: ${error.message}`);
  return data;
}

/**
 * Get all alerts for a user
 */
export async function getUserAlerts(userId: string): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get alerts: ${error.message}`);
  return (data || []).map(a => ({
    ...a,
    config: typeof a.config === 'string' ? JSON.parse(a.config) : a.config
  }));
}

/**
 * Update an existing alert
 */
export async function updateAlert(
  alertId: string,
  updates: Partial<Pick<Alert, 'name' | 'config' | 'channels' | 'enabled'>>
): Promise<Alert> {
  const updateData: any = { ...updates };
  if (updates.config) {
    updateData.config = JSON.stringify(updates.config);
  }

  const { data, error } = await supabase
    .from('user_alerts')
    .update(updateData)
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update alert: ${error.message}`);
  return {
    ...data,
    config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config
  };
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from('user_alerts')
    .delete()
    .eq('id', alertId);

  if (error) throw new Error(`Failed to delete alert: ${error.message}`);
}

/**
 * Get alert history for a user
 */
export async function getAlertHistory(
  userId: string,
  limit = 50
): Promise<AlertHistory[]> {
  const { data, error } = await supabase
    .from('alert_history')
    .select('*')
    .eq('user_id', userId)
    .order('triggered_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get alert history: ${error.message}`);
  return data || [];
}

/**
 * Mark alert history as read
 */
export async function markAlertRead(historyId: string): Promise<void> {
  const { error } = await supabase
    .from('alert_history')
    .update({ read: true })
    .eq('id', historyId);

  if (error) console.error('Failed to mark alert read:', error);
}

// Notification Preference Functions

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('user_notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { email: true, telegram: false, inApp: true };
  }

  return {
    email: data.email_enabled ?? true,
    telegram: data.telegram_enabled ?? false,
    inApp: data.in_app_enabled ?? true,
    quietHours: data.quiet_hours,
    minSeverity: data.min_severity
  };
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences
): Promise<void> {
  const { error } = await supabase
    .from('user_notification_prefs')
    .upsert({
      user_id: userId,
      email_enabled: prefs.email,
      telegram_enabled: prefs.telegram,
      in_app_enabled: prefs.inApp,
      quiet_hours: prefs.quietHours,
      min_severity: prefs.minSeverity
    });

  if (error) throw new Error(`Failed to update preferences: ${error.message}`);
}

// Alert Triggering Functions

/**
 * Trigger and process an alert
 */
export async function triggerAlert(
  alertId: string,
  message: string,
  severity: AlertSeverity = 'info',
  metadata?: Record<string, any>
): Promise<void> {
  const { data: alert } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('id', alertId)
    .single();

  if (!alert) return;

  // Log to history
  await supabase.from('alert_history').insert({
    alert_id: alertId,
    user_id: alert.user_id,
    message,
    severity,
    metadata: metadata ? JSON.stringify(metadata) : null,
    triggered_at: new Date().toISOString()
  });

  // Get user preferences
  const prefs = await getNotificationPreferences(alert.user_id);

  // Check if we should notify based on preferences
  if (prefs.quietHours && isInQuietHours(prefs.quietHours)) {
    return; // Skip notification during quiet hours unless critical
  }

  if (prefs.minSeverity && severityRank(severity) < severityRank(prefs.minSeverity)) {
    return; // Skip if below minimum severity
  }

  // Send notifications through enabled channels
  const tasks: Promise<void>[] = [];

  if (prefs.email && alert.channels.includes('email')) {
    tasks.push(sendEmailNotification(alert.user_id, message, severity));
  }

  if (prefs.telegram && alert.channels.includes('telegram')) {
    tasks.push(sendTelegramNotification(alert.user_id, message, severity));
  }

  if (prefs.inApp && alert.channels.includes('in_app')) {
    tasks.push(sendInAppNotification(alert.user_id, message, severity));
  }

  await Promise.all(tasks);
}

/**
 * Check price alert conditions
 */
export async function checkPriceAlerts(
  symbol: string,
  currentPrice: number
): Promise<void> {
  const { data: alerts } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('type', 'price')
    .eq('enabled', true);

  if (!alerts) return;

  for (const alert of alerts) {
    const config: PriceAlertConfig = typeof alert.config === 'string' 
      ? JSON.parse(alert.config) 
      : alert.config;

    if (config.symbol !== symbol) continue;

    let triggered = false;
    let message = '';

    switch (config.condition) {
      case 'above':
        if (currentPrice >= config.threshold) {
          triggered = true;
          message = `${symbol} crossed ABOVE ${config.threshold} (Current: ${currentPrice})`;
        }
        break;
      case 'below':
        if (currentPrice <= config.threshold) {
          triggered = true;
          message = `${symbol} crossed BELOW ${config.threshold} (Current: ${currentPrice})`;
        }
        break;
      case 'change_percent':
        if (config.currentPrice) {
          const changePercent = ((currentPrice - config.currentPrice) / config.currentPrice) * 100;
          if (Math.abs(changePercent) >= config.threshold) {
            triggered = true;
            message = `${symbol} changed ${changePercent.toFixed(2)}}% (Threshold: ${config.threshold}%)`;
          }
        }
        break;
    }

    if (triggered) {
      await triggerAlert(
        alert.id,
        message,
        'warning',
        { symbol, currentPrice, threshold: config.threshold }
      );

      // Disable one-time alerts
      if (config.condition === 'above' || config.condition === 'below') {
        await supabase
          .from('user_alerts')
          .update({ enabled: false })
          .eq('id', alert.id);
      }
    }
  }
}

/**
 * Create system alert
 */
export async function createSystemAlert(
  event: SystemAlertConfig['event'],
  message: string,
  severity: AlertSeverity = 'critical'
): Promise<void> {
  // Get all users with this system alert type enabled
  const { data: alerts } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('type', 'system')
    .eq('enabled', true);

  if (!alerts) return;

  for (const alert of alerts) {
    const config: SystemAlertConfig = typeof alert.config === 'string'
      ? JSON.parse(alert.config)
      : alert.config;

    if (config.event === event) {
      await triggerAlert(alert.id, message, severity);
    }
  }
}

/**
 * Create activity alert
 */
export async function createActivityAlert(
  userId: string,
  event: ActivityAlertConfig['event'],
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Check user-specific alerts
  const { data: alerts } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('type', 'activity')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (!alerts) return;

  for (const alert of alerts) {
    const config: ActivityAlertConfig = typeof alert.config === 'string'
      ? JSON.parse(alert.config)
      : alert.config;

    if (config.event === event) {
      // Check threshold if applicable
      if (config.threshold && metadata?.amount) {
        if (metadata.amount < config.threshold) continue;
      }

      await triggerAlert(alert.id, message, 'info', metadata);
    }
  }
}

// Notification Delivery Functions

async function sendEmailNotification(
  userId: string,
  message: string,
  severity: AlertSeverity
): Promise<void> {
  const { data: user } = await supabase
    .from('hub_users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!user?.email) return;

  // In production, integrate with email service (SendGrid, Resend, etc.)
  console.log(`[Alerter] Email to ${user.email}: [${severity.toUpperCase()}] ${message}`);
}

async function sendTelegramNotification(
  userId: string,
  message: string,
  severity: AlertSeverity
): Promise<void> {
  const { data: prefs } = await supabase
    .from('user_telegram')
    .select('chat_id')
    .eq('user_id', userId)
    .single();

  if (!prefs?.chat_id) return;

  // In production, use Telegram Bot API
  const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[Alerter] Telegram to ${prefs.chat_id}: ${emoji} ${message}`);
}

async function sendInAppNotification(
  userId: string,
  message: string,
  severity: AlertSeverity
): Promise<void> {
  // Store in-app notification
  await supabase.from('in_app_notifications').insert({
    user_id: userId,
    message,
    severity,
    created_at: new Date().toISOString()
  });
}

// Utility Functions

function isInQuietHours(quietHours: { start: string; end: string }): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  }
  return currentTime >= start || currentTime <= end;
}

function severityRank(severity: AlertSeverity): number {
  const ranks = { info: 1, warning: 2, critical: 3 };
  return ranks[severity];
}

export const alerter = {
  createAlert,
  getUserAlerts,
  updateAlert,
  deleteAlert,
  getAlertHistory,
  markAlertRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  checkPriceAlerts,
  createSystemAlert,
  createActivityAlert,
  triggerAlert
};

export default alerter;
