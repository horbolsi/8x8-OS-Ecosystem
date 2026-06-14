import { startHubBot, stopHubBot } from './hubBot.js';
import { startAdminBot, stopAdminBot } from './adminBot.js';
import { hubBot } from './hubBot.js';
import { adminBot } from './adminBot.js';
let hubStarted = false, adminStarted = false;

function getEnvBotToken() {
  return (
    process.env.TG_HUB_BOT_TOKEN ||
    process.env.TG_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.HUB_BOT_TOKEN ||
    undefined
  );
}

function getEnvAdminToken() {
  return (
    process.env.TG_ADMIN_BOT_TOKEN ||
    process.env.TG_ADMIN_TOKEN ||
    process.env.TELEGRAM_ADMIN_BOT_TOKEN ||
    process.env.ADMIN_BOT_TOKEN ||
    undefined
  );
}

export async function initBots() {
  const hubToken = getEnvBotToken();
  const adminToken = getEnvAdminToken();
  if (hubToken && !hubStarted) {
    await startHubBot(hubToken);
    hubStarted = true;
  }
  if (adminToken && !adminStarted) {
    await startAdminBot(adminToken);
    adminStarted = true;
  }
}

export function getBotStatus() {
  return {
    hubBot: hubStarted,
    adminBot: adminStarted,
    hubConfigured: Boolean(getEnvBotToken()),
    adminConfigured: Boolean(getEnvAdminToken()),
  };
}

export function handleHubWebhook(body: any) {
  console.log('[HubWebhook] Received update');
  if (!hubBot) {
    console.error('[HubWebhook] No HubBot instance available to process update.');
    return;
  }
  void hubBot.handleUpdate(body).catch((err) => {
    console.error('[HubWebhook] handleUpdate error:', err);
  });
}

export function handleAdminWebhook(body: any) {
  console.log('[AdminWebhook] Received update');
  if (!adminBot) {
    console.error('[AdminWebhook] No AdminBot instance available to process update.');
    return;
  }
  void adminBot.handleUpdate(body).catch((err) => {
    console.error('[AdminWebhook] handleUpdate error:', err);
  });
}
