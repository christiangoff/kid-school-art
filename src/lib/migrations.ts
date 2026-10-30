// Each entry runs once, in order. Never edit a migration that has shipped;
// add a new one instead.
export const migrations: string[] = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE families (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- role: owner (manages members), parent (adds kids and art), viewer (read only)
  CREATE TABLE family_members (
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'parent', 'viewer')),
    relationship TEXT,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (family_id, user_id)
  );

  CREATE TABLE kids (
    id INTEGER PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birthdate TEXT,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE invites (
    id INTEGER PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'parent', 'viewer')),
    relationship TEXT,
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TEXT NOT NULL,
    accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX kids_family ON kids(family_id);
  CREATE INDEX invites_family ON invites(family_id);
  CREATE INDEX sessions_user ON sessions(user_id);
  `,
];
