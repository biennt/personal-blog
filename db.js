const Database = require("better-sqlite3");
const path = require("path");

const dataDir = process.env.DATA_DIR || __dirname;
const db = new Database(path.join(dataDir, "blog.db"));

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    slug       TEXT    NOT NULL UNIQUE,
    content    TEXT    NOT NULL,
    excerpt    TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
`);

// --------------- helpers ---------------

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeExcerpt(markdown, maxLen = 200) {
  // Strip markdown-ish syntax for a plain-text excerpt
  const plain = markdown
    .replace(/[#*_`~>\[\]!()-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "..." : plain;
}

// Ensure slug uniqueness by appending a counter if needed
function uniqueSlug(base, excludeId = null) {
  let slug = slugify(base);
  if (!slug) slug = "untitled";
  let candidate = slug;
  let counter = 2;
  while (true) {
    const row = excludeId
      ? db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").get(candidate, excludeId)
      : db.prepare("SELECT id FROM posts WHERE slug = ?").get(candidate);
    if (!row) return candidate;
    candidate = `${slug}-${counter++}`;
  }
}

// --------------- CRUD ---------------

const getAllPosts = db.prepare(
  "SELECT id, title, slug, excerpt, created_at, updated_at FROM posts ORDER BY created_at DESC"
);

const getPostBySlug = db.prepare("SELECT * FROM posts WHERE slug = ?");
const getPostById = db.prepare("SELECT * FROM posts WHERE id = ?");

const insertPost = db.prepare(
  "INSERT INTO posts (title, slug, content, excerpt) VALUES (@title, @slug, @content, @excerpt)"
);

const updatePost = db.prepare(
  `UPDATE posts
      SET title = @title,
          slug  = @slug,
          content = @content,
          excerpt = @excerpt,
          updated_at = datetime('now')
    WHERE id = @id`
);

const deletePost = db.prepare("DELETE FROM posts WHERE id = ?");

module.exports = {
  db,
  slugify,
  makeExcerpt,
  uniqueSlug,
  getAllPosts,
  getPostBySlug,
  getPostById,
  insertPost,
  updatePost,
  deletePost,
};
