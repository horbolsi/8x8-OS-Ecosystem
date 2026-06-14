export function isPostgresConnectionString(url?: string): url is string {
  return typeof url === "string" && /^(postgres|postgresql):\/\/.+/i.test(url);
}

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!isPostgresConnectionString(url)) {
    console.warn("⚠️ DATABASE_URL must be a PostgreSQL connection string (postgres:// or postgresql://).");
    console.warn("   Neon REST endpoints (https://...neon.tech/...) are not supported here.");
    console.warn("   Use the Neon PostgreSQL connection string from your Neon dashboard.");
    return null;
  }
  return url;
}
