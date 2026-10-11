import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { join, resolve, dirname, parse } from "path";

const MEMORY_DIR = ".memory";
const MEMORY_FILE = "memory.db";

export function findMemoryDb(startPath: string): string {
  let current = resolve(startPath);
  const root = parse(current).root;

  while (true) {
    const dir = join(current, MEMORY_DIR);
    if (existsSync(dir)) {
      return join(dir, MEMORY_FILE);
    }
    if (current === root) {
      throw new Error(
        `No ${MEMORY_DIR}/ found walking up from ${startPath}. ` +
        `Create ${MEMORY_DIR}/ at desired project/workspace root.`
      );
    }
    current = dirname(current);
  }
}

const cache = new Map<string, Database>();

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS slices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_id TEXT NOT NULL REFERENCES slices(id),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  UNIQUE(slice_id, name)
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  UNIQUE(entity_id, content)
);

CREATE TABLE IF NOT EXISTS relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_id TEXT NOT NULL REFERENCES slices(id),
  from_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  UNIQUE(slice_id, from_entity_id, to_entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_entities_slice ON entities(slice_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_relations_slice ON relations(slice_id);
CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_id);
`;

export function getDbForCwd(cwd: string): Database {
  const dbPath = findMemoryDb(cwd);

  let db = cache.get(dbPath);
  if (!db) {
    mkdirSync(dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec(SCHEMA);
    cache.set(dbPath, db);
  }
  return db;
}

export function closeAll(): void {
  for (const db of cache.values()) db.close();
  cache.clear();
}
