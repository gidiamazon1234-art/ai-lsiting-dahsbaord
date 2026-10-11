/**
 * A tiny stand-in for the slice of supabase-js the API routes use, executing
 * against a real Postgres (the actual migration + RLS-free service role path).
 * Storage is kept in memory. Test-only.
 */
import { Pool } from "pg";

type Filter = { col: string; op: "=" | "<" | "in"; value: unknown };

export function createFakeSupabase(pool: Pool) {
  const storage = new Map<string, Uint8Array>();

  class Query implements PromiseLike<{ data: any; error: any }> {
    private op: "select" | "update" | "delete" | "insert" = "select";
    private patch: Record<string, unknown> = {};
    private filters: Filter[] = [];
    private orderBy: { col: string; asc: boolean } | null = null;
    private max: number | null = null;
    private mode: "many" | "single" | "maybeSingle" = "many";
    private returning = false;

    constructor(private table: string) {}

    select(_cols?: string) {
      if (this.op !== "select") this.returning = true;
      return this;
    }
    update(patch: Record<string, unknown>) {
      this.op = "update";
      this.patch = patch;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(col: string, value: unknown) {
      this.filters.push({ col, op: "=", value });
      return this;
    }
    lt(col: string, value: unknown) {
      this.filters.push({ col, op: "<", value });
      return this;
    }
    in(col: string, value: unknown[]) {
      this.filters.push({ col, op: "in", value });
      return this;
    }
    order(col: string, opts?: { ascending?: boolean }) {
      this.orderBy = { col, asc: opts?.ascending ?? true };
      return this;
    }
    limit(n: number) {
      this.max = n;
      return this;
    }
    single() {
      this.mode = "single";
      return this;
    }
    maybeSingle() {
      this.mode = "maybeSingle";
      return this;
    }

    private async run() {
      const params: unknown[] = [];
      const p = (v: unknown) => {
        params.push(v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);
        return `$${params.length}`;
      };
      const where = this.filters.length
        ? " where " +
          this.filters
            .map((f) => (f.op === "in" ? `${f.col} = any(${p(f.value)})` : `${f.col} ${f.op} ${p(f.value)}`))
            .join(" and ")
        : "";
      let sql: string;
      if (this.op === "select") {
        sql = `select * from public.${this.table}${where}`;
        if (this.orderBy) sql += ` order by ${this.orderBy.col} ${this.orderBy.asc ? "asc" : "desc"}`;
        if (this.max) sql += ` limit ${this.max}`;
      } else if (this.op === "update") {
        const sets = Object.entries(this.patch).map(([k, v]) => `${k} = ${p(v)}`);
        sql = `update public.${this.table} set ${sets.join(", ")}${where}${this.returning ? " returning *" : ""}`;
      } else {
        sql = `delete from public.${this.table}${where}`;
      }
      const { rows } = await pool.query(sql, params);
      const normalized = rows.map(normalizeRow);
      if (this.mode === "many") return { data: normalized, error: null };
      if (normalized.length === 0) {
        return this.mode === "single" ? { data: null, error: { message: "no rows" } } : { data: null, error: null };
      }
      return { data: normalized[0], error: null };
    }

    then<T1 = { data: any; error: any }, T2 = never>(
      onfulfilled?: ((value: { data: any; error: any }) => T1 | PromiseLike<T1>) | null,
      onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null,
    ) {
      return this.run().then(onfulfilled, onrejected);
    }
  }

  const bucket = (name: string) => ({
    async upload(path: string, bytes: Uint8Array) {
      storage.set(`${name}/${path}`, bytes);
      return { data: { path }, error: null };
    },
    async createSignedUrl(path: string, _ttl: number) {
      if (!storage.has(`${name}/${path}`)) return { data: null, error: { message: "Object not found" } };
      return { data: { signedUrl: `https://storage.test/${name}/${path}?token=x` }, error: null };
    },
    async createSignedUrls(paths: string[], _ttl: number, opts?: { download?: boolean }) {
      return {
        data: paths.map((path) => ({
          path,
          signedUrl: storage.has(`${name}/${path}`)
            ? `https://storage.test/${name}/${path}?token=x${opts?.download ? "&download=" : ""}`
            : null,
          error: null,
        })),
        error: null,
      };
    },
    async remove(paths: string[]) {
      paths.forEach((path) => storage.delete(`${name}/${path}`));
      return { data: [], error: null };
    },
  });

  return {
    storage: { from: bucket, _objects: storage },
    from: (table: string) => new Query(table),
    async rpc(fn: string, args: Record<string, unknown>) {
      const keys = Object.keys(args);
      const values = keys.map((k) => {
        const v = args[k];
        return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      });
      const call = `public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
      try {
        const scalar = ["add_credits", "check_rate_limit"].includes(fn);
        const { rows } = await pool.query(scalar ? `select ${call} as v` : `select * from ${call}`, values);
        if (scalar) return { data: rows[0]?.v ?? null, error: null };
        const row = rows[0] ? normalizeRow(rows[0]) : null;
        return { data: row && row.id ? row : null, error: null };
      } catch (err) {
        return { data: null, error: { message: (err as Error).message } };
      }
    },
  };
}

function normalizeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v;
  return out;
}
