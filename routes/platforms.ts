import type { Express, Response } from 'express';

const SOCIAL_PLATFORMS = Object.freeze({
  telegram: {
    name: 'Telegram',
    features: ['private status', 'draft-only messaging proposals'],
    truth_class: 'SIMULATED',
  },
  youtube: {
    name: 'YouTube',
    features: ['public metadata research', 'draft scripts and metadata'],
    truth_class: 'SIMULATED',
  },
  tiktok: {
    name: 'TikTok',
    features: ['public trend research', 'draft short-form variants'],
    truth_class: 'SIMULATED',
  },
  facebook: {
    name: 'Facebook',
    features: ['public Page research', 'draft Page and Reel variants'],
    truth_class: 'SIMULATED',
  },
  x: {
    name: 'X',
    features: ['public research', 'draft Post variants'],
    truth_class: 'SIMULATED',
  },
});

const CLOSED_GATES = Object.freeze([
  'PLATFORM_CREDENTIAL_CONNECT',
  'OAUTH_AUTHORIZE',
  'SOCIAL_UPLOAD',
  'PUBLIC_CONTENT_PUBLISH',
  'EXTERNAL_MESSAGE_SEND',
  'COMMENT_OR_REPLY',
  'DIRECT_MESSAGE',
  'ACCOUNT_MUTATION',
  'FINANCIAL_EXECUTION',
  'WALLET_OR_ASSET_MOVEMENT',
]);

function gated(res: Response, action: string) {
  return res.status(403).json({
    success: false,
    code: 'PUBLIC_DEMO_GATED',
    action,
    truth_class: 'LIVE',
    executed: false,
    message:
      'Public companion routes never accept platform credentials or perform social, trading, wallet, or account mutations.',
  });
}

export function registerPlatformRoutes(app: Express) {
  app.get('/api/platforms/status', (_req, res) => {
    res.json({
      truth_class: 'SIMULATED',
      public_demo: true,
      social: SOCIAL_PLATFORMS,
      trading: {},
      wallets: {},
      closed_gates: CLOSED_GATES,
      credentials_accepted: false,
      private_accounts_exposed: false,
    });
  });

  app.get('/api/platforms/social/accounts', (_req, res) => {
    res.json({
      accounts: [],
      truth_class: 'LIVE',
      public_demo: true,
      credentials_accepted: false,
      message: 'Private social accounts are intentionally excluded from the public companion.',
    });
  });

  app.get('/api/platforms/trading/accounts', (_req, res) => {
    res.json({
      accounts: [],
      truth_class: 'LIVE',
      public_demo: true,
      message: 'Private trading accounts are intentionally excluded from the public companion.',
    });
  });

  app.get('/api/platforms/wallet/accounts', (_req, res) => {
    res.json({
      accounts: [],
      truth_class: 'LIVE',
      public_demo: true,
      message: 'Private wallets are intentionally excluded from the public companion.',
    });
  });

  const closedPostRoutes = [
    '/api/platforms/social/connect',
    '/api/platforms/social/publish',
    '/api/platforms/social/message',
    '/api/platforms/trading/connect',
    '/api/platforms/trading/order',
    '/api/platforms/wallet/connect',
    '/api/platforms/wallet/transfer',
  ];

  for (const path of closedPostRoutes) {
    app.post(path, (_req, res) => gated(res, path));
  }

  app.delete('/api/platforms/social/disconnect/:platform', (_req, res) =>
    gated(res, 'SOCIAL_ACCOUNT_DISCONNECT'),
  );
  app.delete('/api/platforms/trading/disconnect/:platform', (_req, res) =>
    gated(res, 'TRADING_ACCOUNT_DISCONNECT'),
  );
  app.delete('/api/platforms/wallet/disconnect/:wallet', (_req, res) =>
    gated(res, 'WALLET_DISCONNECT'),
  );
}
