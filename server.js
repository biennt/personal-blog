const express = require("express");
const path = require("path");
const { marked } = require("marked");
const {
  getAllPosts,
  getPostBySlug,
  getPostById,
  insertPost,
  updatePost,
  deletePost,
  uniqueSlug,
  makeExcerpt,
} = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- config ---------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Make `marked` available inside templates
app.locals.marked = marked;

// --------------- routes ---------------

// Home — list all posts
app.get("/", (_req, res) => {
  const posts = getAllPosts.all();
  res.render("index", { posts });
});

// New post form
app.get("/new", (_req, res) => {
  res.render("editor", { post: null });
});

// Create post
app.post("/new", (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).render("editor", {
      post: { title, content },
      error: "Title and content are required.",
    });
  }
  const slug = uniqueSlug(title);
  const excerpt = makeExcerpt(content);
  insertPost.run({ title, slug, content, excerpt });
  res.redirect(`/post/${slug}`);
});

// View single post
app.get("/post/:slug", (req, res) => {
  const post = getPostBySlug.get(req.params.slug);
  if (!post) return res.status(404).render("404");
  res.render("post", { post });
});

// Edit post form
app.get("/edit/:id", (req, res) => {
  const post = getPostById.get(req.params.id);
  if (!post) return res.status(404).render("404");
  res.render("editor", { post });
});

// Update post
app.post("/edit/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = getPostById.get(id);
  if (!existing) return res.status(404).render("404");

  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).render("editor", {
      post: { ...existing, title, content },
      error: "Title and content are required.",
    });
  }
  const slug = uniqueSlug(title, id);
  const excerpt = makeExcerpt(content);
  updatePost.run({ id, title, slug, content, excerpt });
  res.redirect(`/post/${slug}`);
});

// Delete post
app.post("/delete/:id", (req, res) => {
  deletePost.run(Number(req.params.id));
  res.redirect("/");
});

// API: live Markdown preview
app.post("/api/preview", (req, res) => {
  const { content } = req.body;
  const html = marked(content || "");
  res.json({ html });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).render("404");
});

// --------------- start ---------------

app.listen(PORT, () => {
  console.log(`Blog running at http://localhost:${PORT}`);
});
