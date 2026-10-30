import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrations } from "./migrations";

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "./data");

let instance: Database.Database | null = null;

/** Opens a database and brings its schema up to date. */
export function openDatabase(file: string): Database.Database {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: Database.Database) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < migrations.length; v++) {
    db.transaction(() => {
      db.exec(migrations[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

/** The app-wide database, stored in DATA_DIR. */
export function db(): Database.Database {
  if (!instance) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    instance = openDatabase(path.join(DATA_DIR, "app.db"));
  }
  return instance;
}

/** Swaps in another database, for tests. */
export function setDatabase(next: Database.Database) {
  instance = next;
}
