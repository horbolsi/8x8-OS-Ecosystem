const TARGET_URL = 'https://8x8-os-ecosystem.vercel.app/telegram';
const EXPECTED_BOT = 'app8x8org_bot';

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(body);
}

async function telegram(token, method, init) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, init);
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok && body?.ok === true, status: response.status, body };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, state: 'METHOD_NOT_ALLOWED' });

  const token = process.env.APP8X8ORG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  const apply = String(req.query?.apply || '') === '1';

  if (!token) {
    return json(res, 503, {
      ok: false,
      state: 'BLOCKED_SECRET_NOT_CONFIGURED_IN_VERCEL',
      secret_configured: false,
      target_url: TARGET_URL,
      raw_token_exposed: false,
    });
  }

  if (!apply) {
    return json(res, 200, {
      ok: true,
      state: 'SECRET_CONFIGURED_APPLY_NOT_REQUESTED',
      secret_configured: true,
      target_url: TARGET_URL,
      expected_bot: EXPECTED_BOT,
      raw_token_exposed: false,
    });
  }

  try {
    const me = await telegram(token, 'getMe');
    if (!me.ok || me.body?.result?.username !== EXPECTED_BOT) {
      return json(res, 409, {
        ok: false,
        state: 'BLOCKED_BOT_IDENTITY_MISMATCH',
        expected_bot: EXPECTED_BOT,
        observed_bot: me.body?.result?.username || null,
        raw_token_exposed: false,
      });
    }

    const setBody = {
      menu_button: {
        type: 'web_app',
        text: 'Open 8x8',
        web_app: { url: TARGET_URL },
      },
    };
    const setResult = await telegram(token, 'setChatMenuButton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setBody),
    });
    if (!setResult.ok || setResult.body?.result !== true) {
      return json(res, 502, {
        ok: false,
        state: 'BLOCKED_SET_CHAT_MENU_BUTTON_FAILED',
        raw_token_exposed: false,
      });
    }

    const readback = await telegram(token, 'getChatMenuButton');
    const menu = readback.body?.result || {};
    const observedUrl = menu?.web_app?.url || null;
    if (!readback.ok || menu.type !== 'web_app' || observedUrl !== TARGET_URL) {
      return json(res, 502, {
        ok: false,
        state: 'BLOCKED_MENU_READBACK_MISMATCH',
        observed_type: menu.type || null,
        observed_url: observedUrl,
        target_url: TARGET_URL,
        raw_token_exposed: false,
      });
    }

    return json(res, 200, {
      ok: true,
      state: 'PRESENT_PROVEN_TELEGRAM_MENU_BOUND',
      bot: EXPECTED_BOT,
      target_url: TARGET_URL,
      readback: 'PASS',
      raw_token_exposed: false,
    });
  } catch (error) {
    return json(res, 502, {
      ok: false,
      state: 'BLOCKED_TELEGRAM_API_EXCEPTION',
      error_class: error?.name || 'Error',
      raw_token_exposed: false,
    });
  }
}
