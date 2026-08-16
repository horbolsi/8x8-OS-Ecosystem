const ALLOWED_GRANULARITIES = new Set(['1min','5min','15min','30min','1h','4h','1day','1week']);
const DEFAULT_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','TONUSDT'];
const SYMBOL_RE = /^[A-Z0-9]{3,24}$/;
const BITGET = 'https://api.bitget.com';

function safeSymbol(value) {
  const symbol = String(value || '').toUpperCase().trim();
  if (!SYMBOL_RE.test(symbol)) throw new Error('INVALID_SYMBOL');
  return symbol;
}

async function bitget(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`${BITGET}${path}`, {
      headers: { 'accept': 'application/json', 'user-agent': '8x8-public-market-intelligence/1.0' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`BITGET_HTTP_${response.status}`);
    const body = await response.json();
    if (body?.code !== '00000') throw new Error(`BITGET_${body?.code || 'UNKNOWN'}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-8X8-Data-Class', 'PUBLIC_MARKET_DATA_NO_ACCOUNT_AUTHORITY');
  res.setHeader('X-8X8-Trading-Authority', 'NONE');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const mode = String(req.query?.mode || 'overview');
    if (mode === 'candles') {
      const symbol = safeSymbol(req.query?.symbol || 'BTCUSDT');
      const granularity = String(req.query?.granularity || '15min');
      if (!ALLOWED_GRANULARITIES.has(granularity)) throw new Error('INVALID_GRANULARITY');
      const rawLimit = Number(req.query?.limit || 96);
      const limit = Math.max(10, Math.min(200, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 96));
      const body = await bitget(`/api/v2/spot/market/candles?symbol=${encodeURIComponent(symbol)}&granularity=${encodeURIComponent(granularity)}&limit=${limit}`);
      const candles = (body.data || []).map(row => ({
        ts: Number(row[0]), open: numberOrNull(row[1]), high: numberOrNull(row[2]), low: numberOrNull(row[3]), close: numberOrNull(row[4]), baseVolume: numberOrNull(row[5]), quoteVolume: numberOrNull(row[6]),
      })).filter(row => Number.isFinite(row.ts) && row.close !== null).sort((a,b) => a.ts-b.ts);
      return res.status(200).json({
        schema: '8x8.public-market-candles.v1', source: 'Bitget public Spot API', symbol, granularity, tradingAuthority: false, accountData: false, candles, observedAt: new Date().toISOString(),
      });
    }

    const requested = String(req.query?.symbols || DEFAULT_SYMBOLS.join(','))
      .split(',').map(s => s.trim()).filter(Boolean).slice(0, 12).map(safeSymbol);
    const symbols = requested.length ? [...new Set(requested)] : DEFAULT_SYMBOLS;
    const rows = await Promise.all(symbols.map(async symbol => {
      try {
        const body = await bitget(`/api/v2/spot/market/tickers?symbol=${encodeURIComponent(symbol)}`);
        const x = body.data?.[0] || {};
        const last = numberOrNull(x.lastPr);
        const open = numberOrNull(x.open);
        const change24hPercent = last !== null && open ? ((last-open)/open)*100 : null;
        return {
          symbol,
          last,
          high24h: numberOrNull(x.high24h),
          low24h: numberOrNull(x.low24h),
          baseVolume24h: numberOrNull(x.baseVolume),
          quoteVolume24h: numberOrNull(x.quoteVolume || x.usdtVolume),
          bid: numberOrNull(x.bidPr),
          ask: numberOrNull(x.askPr),
          change24hPercent,
          state: 'PUBLIC_MARKET_PRESENT',
        };
      } catch (error) {
        return { symbol, state: 'PUBLIC_MARKET_UNAVAILABLE', error: String(error?.message || error) };
      }
    }));
    return res.status(200).json({
      schema: '8x8.public-market-overview.v1',
      source: 'Bitget public Spot API',
      tradingAuthority: false,
      credentialsUsed: false,
      accountData: false,
      rows,
      observedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({ schema: '8x8.public-market-error.v1', error: String(error?.message || error), tradingAuthority: false, credentialsUsed: false });
  }
}
