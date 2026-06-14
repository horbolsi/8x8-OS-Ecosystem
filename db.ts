// Postgres-backed storage adapter for app hub content.
// Keeps in-memory fallback behavior when DATABASE_URL is missing.

import pg from 'pg';
import { getDatabaseUrl } from './db-utils.js';
const { Pool } = pg;

const databaseUrl = getDatabaseUrl();
export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : null;

// ── In-memory fallback store ─────────────────────────────────────────────────
type Row = Record<string, any>;
const store: Record<string, any[]> = {
  bubbles: [],
  detectedUrls: [],
  notes: [],
  blockchainTransactions: [],
  nfts: [],
  walletAddresses: [],
  stakingPools: [],
  socialPosts: [],
  leaderboard: [],
  governanceProposals: [],
  referrals: [],
  activityFeed: [],
};
let autoId = 1;
function nextId() { return autoId++; }

// ── Query builder ────────────────────────────────────────────────────────────
// Supports: db.select().from(table).where(eq(col,val)).orderBy(col).limit(n)

type Pred = (row: Row) => boolean;

type EqCond = { __eq__: true; col: string; val: any };

type AnyCond = EqCond | { __pred__: Pred };

function isEqCond(c: any): c is EqCond {
  return c && typeof c === 'object' && c.__eq__ === true;
}

class QueryBuilder {
  private _table: string = '';
  private _cond: AnyCond | null = null;
  private _orderBy: string | null = null;
  private _limit: number | null = null;

  from(tableRef: any): this {
    this._table = String(tableRef?.__name__ || '');
    return this;
  }

  where(cond: any): this {
    this._cond = cond;
    return this;
  }

  orderBy(col: any): this {
    // shared/schema provides { __field__ }
    this._orderBy = String(col?.__field__ || col);
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  async then(resolve: (v: Row[]) => any, reject?: (e: any) => any): Promise<any> {
    try {
      // In-memory fallback
      if (!pool) {
        let rows: Row[] = store[this._table] ? [...store[this._table]] : [];
        if (this._cond) {
          if (isEqCond(this._cond)) {
            rows = rows.filter(r => r[(this._cond as EqCond).col] === (this._cond as EqCond).val);
          } else if ((this._cond as any).__pred__) {
            rows = rows.filter((this._cond as any).__pred__);
          }
        }
        if (this._orderBy) {
          // Best-effort sort for in-memory (no direction tracked)
          const key = this._orderBy;
          rows.sort((a, b) => (a[key] > b[key] ? -1 : 1));
        }

        if (this._limit !== null) rows = rows.slice(0, this._limit);
        return resolve(rows);
      }

      // SQL mode
      const p = pool;
      const whereParts: string[] = [];
      const values: any[] = [];

      if (this._cond && isEqCond(this._cond)) {
        whereParts.push(`${(this._cond as EqCond).col} = $${values.length + 1}`);
        values.push((this._cond as EqCond).val);
      }

      const whereSql = whereParts.length ? ` WHERE ${whereParts.join(' AND ')}` : '';

      const orderSql = this._orderBy ? ` ORDER BY ${this._orderBy} DESC` : '';
      const limitSql = this._limit !== null ? ` LIMIT ${this._limit}` : '';

      const sql = `SELECT * FROM ${this._table}${whereSql}${orderSql}${limitSql}`;
      const { rows } = await p.query(sql, values);
      return resolve(rows);
    } catch (e) {
      reject?.(e);
    }
  }
}

// ── Insert / Update / Delete builders ─────────────────────────────────────────
class InsertBuilder {
  private _table: string;
  private _rows: Row[] = [];

  constructor(tableRef: any) {
    this._table = String(tableRef?.__name__ || '');
  }

  values(data: Row | Row[]): this {
    this._rows = Array.isArray(data) ? data : [data];
    return this;
  }

  async returning(): Promise<Row[]> {
    if (!pool) {
      const inserted: Row[] = [];
      for (const row of this._rows) {
        const newRow = { id: nextId(), ...row };
        if (store[this._table]) store[this._table].push(newRow);
        inserted.push(newRow);
      }
      return inserted;
    }

    // SQL mode: insert returning *
    const results: Row[] = [];
    for (const row of this._rows) {
      const keys = Object.keys(row);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => row[k]);
      const sql = `INSERT INTO ${this._table} (${cols}) VALUES (${placeholders}) RETURNING *`;
      const { rows } = await pool!.query(sql, values);
      results.push(rows[0]);
    }
    return results;
  }
}

class UpdateBuilder {
  private _table: string;
  private _updates: Row = {};
  private _cond: AnyCond | null = null;

  constructor(tableRef: any) {
    this._table = String(tableRef?.__name__ || '');
  }

  set(data: Row): this {
    this._updates = data;
    return this;
  }

  where(cond: any): this {
    this._cond = cond;
    return this;
  }

  async returning(): Promise<Row[]> {
    if (!pool) {
      if (!store[this._table]) return [];
      const updated: Row[] = [];
      store[this._table] = store[this._table].map(row => {
        const predOk = !this._cond
          ? true
          : isEqCond(this._cond)
            ? (row[(this._cond as EqCond).col] === (this._cond as EqCond).val)
            : !!(this._cond as any).__pred__?.(row);

        if (predOk) {
          const newRow = { ...row, ...this._updates };
          updated.push(newRow);
          return newRow;
        }
        return row;
      });
      return updated;
    }

    const keys = Object.keys(this._updates);
    const setSql = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = keys.map(k => this._updates[k]);

    let whereSql = '';
    if (this._cond && isEqCond(this._cond)) {
      whereSql = ` WHERE ${(this._cond as EqCond).col} = $${values.length + 1}`;
      values.push((this._cond as EqCond).val);
    } else {
      throw new Error('UpdateBuilder SQL mode requires eq() condition');
    }

    const sql = `UPDATE ${this._table} SET ${setSql}${whereSql} RETURNING *`;
    const { rows } = await pool!.query(sql, values);
    return rows;
  }

  then(resolve: (v: Row[]) => any, reject?: (e: any) => any): any {
    this.returning().then(resolve).catch(reject);
  }
}

class DeleteBuilder {
  private _table: string;
  private _cond: AnyCond | null = null;

  constructor(tableRef: any) {
    this._table = String(tableRef?.__name__ || '');
  }

  where(cond: any): this {
    this._cond = cond;
    return this;
  }

  then(resolve: (v: void) => any, reject?: (e: any) => any): any {
    (async () => {
      try {
        if (!pool) {
          if (store[this._table]) {
            if (isEqCond(this._cond)) {
              const c = this._cond as EqCond;
              store[this._table] = store[this._table].filter(r => r[c.col] !== c.val);
            } else {
              store[this._table] = [];
            }
          }
          resolve(undefined);
          return;
        }

        if (!this._cond || !isEqCond(this._cond)) {
          throw new Error('DeleteBuilder SQL mode requires eq() condition');
        }
        const c = this._cond as EqCond;
        const sql = `DELETE FROM ${this._table} WHERE ${c.col} = $1`;
        await pool!.query(sql, [c.val]);
        resolve(undefined);
      } catch (e) {
        reject?.(e);
      }
    })();
  }
}

export const db = {
  select: () => ({
    from: (tableRef: any) => {
      const qb = new QueryBuilder();
      return qb.from(tableRef);
    },
  }),
  insert: (tableRef: any) => new InsertBuilder(tableRef),
  update: (tableRef: any) => new UpdateBuilder(tableRef),
  delete: (tableRef: any) => new DeleteBuilder(tableRef),
};

// SQL-friendly eq(): we encode column/value.
export function eq(col: any, val: any) {
  const field = String(col?.__field__ || '');
  return { __eq__: true, col: field, val } as EqCond;
}

// order direction helpers kept for compatibility (we always use DESC in SQL mode)
export function desc(col: any) { return col; }
export function asc(col: any) { return col; }export default pool;
