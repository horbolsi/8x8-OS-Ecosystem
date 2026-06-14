import { Bot } from "grammy";
let hubBot: Bot | null = null;

function getWebhookUrl(): string | undefined {
  if (process.env.TG_HUB_BOT_WEBHOOK_URL?.trim()) {
    return process.env.TG_HUB_BOT_WEBHOOK_URL.trim();
  }
  const external = process.env.RENDER_EXTERNAL_URL?.trim() || process.env.URL?.trim();
  if (!external) return undefined;
  const base = external.replace(/\/+$/, '');
  return base.startsWith('http') ? `${base}/api/bot/hub/webhook` : `https://${base}/api/bot/hub/webhook`;
}

export async function startHubBot(token: string) {
  if (hubBot) return hubBot;
  const bot = new Bot(token);
  bot.command("start", async (ctx) => {
    await ctx.reply("Welcome to 8x8‑Hub!\nUse /help to see available commands.");
  });
  bot.command("help", async (ctx) => {
    await ctx.reply("/profile - Your stats\n/leaderboard - Top pioneers\n/referral - Referral rewards");
  });

  const webhookUrl = getWebhookUrl();
  if (webhookUrl) {
    try {
      await bot.api.setWebhook(webhookUrl, { drop_pending_updates: true });
      console.log(`[HubBot] Webhook registered: ${webhookUrl}`);
    } catch (err: any) {
      console.error('[HubBot] Failed to register webhook:', err?.message || err);
    }
  } else {
    console.log('[HubBot] No webhook URL configured. Set TG_HUB_BOT_WEBHOOK_URL or RENDER_EXTERNAL_URL.');
  }

  // No bot.start() – webhook mode
  hubBot = bot;
  console.log("[HubBot] Ready (webhook mode)");
  return bot;
}

export function stopHubBot() { if (hubBot) hubBot.stop(); }
export { hubBot };
