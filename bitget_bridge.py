#!/usr/bin/env python3
"""
8x8 Hub — BitGet Trading Bridge v2
Connects hub to live BitGet API with proper response parsing
"""

import json
import hashlib
import hmac
import time
import urllib.request
import urllib.parse

def load_bitget_creds():
    creds = {}
    try:
        with open('/root/trading_venv/.env') as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    creds[k.strip()] = v.strip()
    except:
        pass
    return creds

def bitget_request(method, path, data=None):
    creds = load_bitget_creds()
    api_key = creds.get('BITGET_API_KEY', '')
    api_secret = creds.get('BITGET_SECRET_KEY', '')
    passphrase = creds.get('BITGET_PASSPHRASE', '')
    
    if not api_key:
        return {'error': 'No API key configured', 'code': '401'}
    
    timestamp = str(int(time.time() * 1000))
    body = json.dumps(data) if data else ''
    query = ''
    if data and method == 'GET':
        query = '?' + urllib.parse.urlencode(data)
        body = ''
    
    msg = timestamp + method.upper() + path + query + body
    sign = hmac.new(api_secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    
    headers = {
        'ACCESS-KEY': api_key,
        'ACCESS-SIGN': sign,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': passphrase,
        'Content-Type': 'application/json',
    }
    
    url = 'https://api.bitget.com' + path + query
    req = urllib.request.Request(url, data=body.encode() if body else None, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read())
        except:
            return {'error': str(e), 'code': str(e.code)}
    except Exception as e:
        return {'error': str(e)}

def get_price(symbol='BTCUSDT'):
    result = bitget_request('GET', '/api/v2/spot/market/tickers', {'symbol': symbol})
    if 'code' in result and result.get('code') == '00000':
        data = result.get('data', [])
        if data:
            return float(data[0].get('lastPr', 0))
    return 0

def get_futures_positions():
    result = bitget_request('GET', '/api/v2/mix/position/all-position?productType=usdt-futures')
    positions = []
    if 'code' in result and result.get('code') == '00000':
        for p in result.get('data', []):
            if float(p.get('total', 0)) > 0:
                positions.append({
                    'symbol': p['symbol'],
                    'side': p.get('holdSide', ''),
                    'size': float(p.get('total', 0)),
                    'entryPrice': float(p.get('openPriceAvg', 0)),
                    'unrealizedPnl': float(p.get('unrealizedPL', 0)),
                    'leverage': int(p.get('leverage', 1)),
                })
    return positions

def get_spot_balance():
    result = bitget_request('GET', '/api/v2/spot/account/assets')
    balances = []
    if 'code' in result and result.get('code') == '00000':
        for b in result.get('data', []):
            avail = float(b.get('available', 0))
            if avail > 0:
                balances.append({
                    'symbol': b.get('coinName', ''),
                    'available': avail,
                    'frozen': float(b.get('frozen', 0)),
                })
    return balances

def get_futures_balance():
    result = bitget_request('GET', '/api/v2/mix/account/account', {'productType': 'usdt-futures'})
    if 'code' in result and result.get('code') == '00000':
        data = result.get('data', {})
        return {
            'equity': float(data.get('accountEquity', 0)),
            'available': float(data.get('available', 0)),
            'unrealizedPnl': float(data.get('unrealizedPL', 0)),
        }
    return {'equity': 0, 'available': 0, 'unrealizedPnl': 0}

if __name__ == '__main__':
    print('=== BitGet Bridge v2 ===')
    print(f'BTC: ${get_price("BTCUSDT"):,.2f}')
    print(f'Spot: {json.dumps(get_spot_balance())}')
    print(f'Futures: {json.dumps(get_futures_balance())}')
    print(f'Positions: {json.dumps(get_futures_positions(), indent=2)}')
