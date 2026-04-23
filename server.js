const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();

console.log("starting server...");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY,
      left_votes INTEGER,
      right_votes INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
    if (!row) {
      db.run("INSERT INTO votes (id, left_votes, right_votes) VALUES (1, 0, 0)");
    }
  });
});

app.get("/votes", (req, res) => {
  db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
    res.json(row);
  });
});

app.post("/vote", (req, res) => {
  const { side } = req.body;

  if (side === "left") {
    db.run("UPDATE votes SET left_votes = left_votes + 1 WHERE id = 1");
  } else {
    db.run("UPDATE votes SET right_votes = right_votes + 1 WHERE id = 1");
  }

  res.sendStatus(200);
});

app.get("/messages", (req, res) => {
  db.all("SELECT * FROM messages ORDER BY id DESC LIMIT 20", (err, rows) => {
    res.json(rows);
  });
});

app.post("/messages", (req, res) => {
  const { text } = req.body;
  db.run("INSERT INTO messages (text) VALUES (?)", [text]);
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

app.post("/reset", (req, res) => {
  db.run("UPDATE votes SET left_votes = 0, right_votes = 0 WHERE id = 1");
  db.run("DELETE FROM messages");
  res.sendStatus(200);
});