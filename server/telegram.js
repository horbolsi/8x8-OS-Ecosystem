import crypto from "crypto";

const MODES = Object.freeze({
  owner: {
    tokenEnv: "TELEGRAM_OWNER_BOT_TOKEN",
    secretEnv: "TELEGRAM_OWNER_WEBHOOK_SECRET",
    ownerEnv: "TELEGRAM_OWNER_USER_ID",
  },
  seraphim: {
    tokenEnv: "TELEGRAM_SERAPHIM_BOT_TOKEN",
    secretEnv: "TELEGRAM_SERAPHIM_WEBHOOK_SECRET",
  },
});

function env(name) {
  return (process.env[name] || "").trim();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function miniAppUrl(req) {
  const configured = env("PUBLIC_MINI_APP_URL");
  if (isHttpsUrl(configured)) return configured;

  const forwardedHost = String(req.get("x-forwarded-host") || "").split(",", 1)[0].trim();
  const host = forwardedHost || req.get("host") || "";
  if (!host) return "";
  const candidate = `https://${host}`;
  return isHttpsUrl(candidate) ? candidate : "";
}

function commandOf(text) {
  return String(text || "")
    .trim()
    .split(/\s+/, 1)[0]
    .toLowerCase()
    .replace(/@[^\s]+$/, "");
}

function keyboard(url) {
  if (!isHttpsUrl(url)) return undefined;
  return {
    inline_keyboard: [[
      {
        text: "⚡ Open 8x8 Cloud Preview",
        web_app: { url },
      },
    ]],
  };
}

async function sendTelegramMessage({ token, chatId, text, replyMarkup }) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`TELEGRAM_SEND_HTTP_${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.ok) throw new Error("TELEGRAM_SEND_REJECTED");
}

function ownerReply(command, appUrl) {
  if (command === "/start" || command === "/help") {
    return {
      text: [
        "⚡ <b>8x8 Owner Cloud Relay</b>",
        "",
        "This cloud-safe relay remains reachable when the phone edge node is offline.",
        "It does not expose the private owner plane, credentials, shell, wallets, or financial execution.",
        "",
        "Commands:",
        "/status — cloud and edge boundary",
        "/miniapp — open the public-safe cloud preview",
        "/help — show this contract",
      ].join("\n"),
      replyMarkup: keyboard(appUrl),
    };
  }

  if (command === "/status") {
    return {
      text: [
        "📡 <b>8x8 Continuity Status</b>",
        "",
        "Cloud relay: <code>ONLINE</code>",
        "Phone edge: <code>NOT_CONNECTED</code>",
        "Private owner plane: <code>NOT_EXPOSED</code>",
        "Arbitrary shell: <code>DISABLED</code>",
        "Wallet and financial actions: <code>DISABLED</code>",
        "",
        "A durable signed edge queue and Neon receipt ledger are the next activation gate.",
      ].join("\n"),
      replyMarkup: keyboard(appUrl),
    };
  }

  if (command === "/miniapp") {
    return {
      text: appUrl
        ? "⚡ Open the currently deployed public-safe 8x8 cloud preview below."
        : "Cloud preview URL is not configured yet.",
      replyMarkup: keyboard(appUrl),
    };
  }

  return {
    text: "Command rejected by the owner relay allowlist. Use /status, /miniapp, or /help.",
    replyMarkup: keyboard(appUrl),
  };
}

function seraphimReply(command, appUrl, firstName) {
  const name = String(firstName || "builder").replace(/[<>]/g, "").slice(0, 60);

  if (command === "/start" || command === "/help") {
    return {
      text: [
        `✦ <b>Welcome to 8x8, ${name}</b>`,
        "",
        "I am Seraphim in public guide mode. I can open the cloud preview and explain verified public features.",
        "",
        "This beta does not perform wallet signing, trading, staking, mining, token sales, government submissions, or private owner actions.",
        "",
        "Commands:",
        "/status — verified public boundary",
        "/miniapp — open the 8x8 preview",
      ].join("\n"),
      replyMarkup: keyboard(appUrl),
    };
  }

  if (command === "/status") {
    return {
      text: [
        "✦ <b>Seraphim Public Status</b>",
        "",
        "Cloud preview: <code>AVAILABLE</code>",
        "Private records mounted: <code>NO</code>",
        "Mutation routes: <code>DISABLED</code>",
        "Financial actions: <code>DISABLED</code>",
        "Product state: <code>PUBLIC-SAFE BETA</code>",
      ].join("\n"),
      replyMarkup: keyboard(appUrl),
    };
  }

  if (command === "/miniapp") {
    return {
      text: appUrl
        ? "✦ The 8x8 gate is ready. Open the public-safe preview below."
        : "The mini app URL is not configured yet.",
      replyMarkup: keyboard(appUrl),
    };
  }

  return {
    text: "Seraphim guide chat is not enabled in this first cloud relay. Use /status, /miniapp, or /help.",
    replyMarkup: keyboard(appUrl),
  };
}

export function telegramConfiguration() {
  return {
    owner_bot_configured: Boolean(
      env(MODES.owner.tokenEnv)
      && env(MODES.owner.secretEnv)
      && env(MODES.owner.ownerEnv)
    ),
    seraphim_bot_configured: Boolean(
      env(MODES.seraphim.tokenEnv)
      && env(MODES.seraphim.secretEnv)
    ),
    private_plane_exposed: false,
    arbitrary_shell_enabled: false,
    edge_execution_enabled: false,
    financial_actions_enabled: false,
  };
}

export function createTelegramWebhookHandler(mode) {
  const contract = MODES[mode];
  if (!contract) throw new Error("UNKNOWN_TELEGRAM_MODE");

  return async function telegramWebhook(req, res) {
    const token = env(contract.tokenEnv);
    const expectedSecret = env(contract.secretEnv);
    const ownerId = contract.ownerEnv ? env(contract.ownerEnv) : "";

    if (!token || !expectedSecret || (mode === "owner" && !ownerId)) {
      res.status(503).json({
        ok: false,
        state: "TELEGRAM_RELAY_NOT_CONFIGURED",
        mode,
      });
      return;
    }

    const suppliedSecret = req.get("x-telegram-bot-api-secret-token") || "";
    if (!safeEqual(suppliedSecret, expectedSecret)) {
      res.status(401).json({ ok: false, error: "INVALID_WEBHOOK_SECRET" });
      return;
    }

    const update = req.body;
    const message = update?.message || update?.edited_message;
    if (!message?.chat?.id) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const userId = String(message.from?.id || "");
    if (mode === "owner" && userId !== ownerId) {
      res.status(200).json({ ok: true, ignored: true, reason: "OWNER_NOT_ALLOWLISTED" });
      return;
    }

    const command = commandOf(message.text);
    const appUrl = miniAppUrl(req);
    const reply = mode === "owner"
      ? ownerReply(command, appUrl)
      : seraphimReply(command, appUrl, message.from?.first_name);

    try {
      await sendTelegramMessage({
        token,
        chatId: message.chat.id,
        text: reply.text,
        replyMarkup: reply.replyMarkup,
      });
      res.status(200).json({ ok: true, mode, update_id: update?.update_id ?? null });
    } catch (error) {
      console.error(JSON.stringify({
        event: "telegram.send.failed",
        mode,
        update_id: update?.update_id ?? null,
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      }));
      res.status(502).json({ ok: false, error: "TELEGRAM_DELIVERY_FAILED" });
    }
  };
}
