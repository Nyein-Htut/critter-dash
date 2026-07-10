const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Set DATABASE_URL to your Neon Postgres connection string (Neon gives you
// one when you create a project, e.g. postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require).
// Locally, put it in a .env file. Works with any standard Postgres connection string.
const connectionString = process.env.DATABASE_URL;

let pool = null;
let dbEnabled = false;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  dbEnabled = true;
} else {
  console.warn(
    '[db] No DATABASE_URL set — running WITHOUT persistence. ' +
    'Profiles and race history will not be saved. Attach a Postgres ' +
    'instance and set DATABASE_URL to enable this.'
  );
}

async function migrate() {
  if (!dbEnabled) return;
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('[db] schema is up to date');
}

async function query(text, params) {
  if (!dbEnabled) return { rows: [] };
  return pool.query(text, params);
}

module.exports = { query, migrate, dbEnabled: () => dbEnabled };
