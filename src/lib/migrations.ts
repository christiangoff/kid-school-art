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
  `
  -- A gallery of a kid's art, usually one per class or school year.
  CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    school TEXT,
    teacher TEXT,
    grade TEXT,
    school_year TEXT,
    description TEXT,
    cover_art_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One piece of art. Files live in DATA_DIR/art/<kid id>/<art id>-<size>.
  CREATE TABLE artworks (
    id INTEGER PRIMARY KEY,
    kid_id INTEGER NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
    title TEXT,
    note TEXT,
    made_on TEXT,
    original_name TEXT,
    original_ext TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX collections_kid ON collections(kid_id);
  CREATE INDEX artworks_kid ON artworks(kid_id);
  CREATE INDEX artworks_collection ON artworks(collection_id);
  `,
  `
  -- Pointing a family member at a piece of art or a collection ("Grandma, look!").
  CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    art_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    tagged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT,
    seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ((art_id IS NULL) <> (collection_id IS NULL))
  );
  CREATE UNIQUE INDEX tags_art ON tags(user_id, art_id) WHERE art_id IS NOT NULL;
  CREATE UNIQUE INDEX tags_collection ON tags(user_id, collection_id) WHERE collection_id IS NOT NULL;

  -- Read-only links for people without an account. Exactly one target is set.
  -- The token is kept so the link can be copied again later; revoking it is
  -- how access is taken away.
  CREATE TABLE share_links (
    id INTEGER PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    kid_id INTEGER REFERENCES kids(id) ON DELETE CASCADE,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    art_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
    label TEXT,
    allow_download INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    revoked_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ((kid_id IS NOT NULL) + (collection_id IS NOT NULL) + (art_id IS NOT NULL) = 1)
  );
  CREATE INDEX share_links_family ON share_links(family_id);
  `,
];
