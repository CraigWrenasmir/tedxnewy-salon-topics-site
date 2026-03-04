const path = require("path");
const fs = require("fs");
const express = require("express");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const app = express();

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "votes.db"));

const topics = [
  {
    id: "health-wellbeing",
    emoji: "🧠",
    title: "Health & Wellbeing",
    description:
      "What if Newcastle became Australia's healthiest city, body and mind? Designing urban environments, community programs and spaces that support physical activity, mental health and genuine belonging.",
  },
  {
    id: "public-spaces-green-city",
    emoji: "🌿",
    title: "Public Spaces & Green City",
    description:
      "What if every suburb felt alive with nature and community? Vibrant civic spaces, biodiversity, tree canopy and ecological corridors woven into the fabric of the city.",
  },
  {
    id: "transport-mobility",
    emoji: "🚲",
    title: "Transport & Mobility",
    description:
      "What if getting around Newcastle was seamless, sustainable and car-light? Public transport, cycling infrastructure and accessibility within the city itself.",
  },
  {
    id: "high-speed-rail-connectivity",
    emoji: "🚄",
    title: "High Speed Rail & Connectivity",
    description:
      "What if High Speed Rail reshaped Newcastle's identity and economy? How faster links to Sydney could change housing, work, business and the city's independence.",
  },
  {
    id: "technology-ai-civic-life",
    emoji: "🤖",
    title: "Technology & AI in Civic Life",
    description:
      "What if digital tools strengthened local democracy? Using technology to increase transparency, participation and smarter decision-making.",
  },
  {
    id: "night-time-economy-culture",
    emoji: "🎶",
    title: "Night-Time Economy & Culture",
    description:
      "What if Newcastle had a thriving, safe and creative night-time life? Reimagining evening culture, live music, hospitality and community safety.",
  },
  {
    id: "inclusion-belonging",
    emoji: "🤝",
    title: "Inclusion & Belonging",
    description:
      "What if everyone in Newcastle felt genuinely seen? Systems and environments that support diversity, accessibility and equity across all communities.",
  },
  {
    id: "youth-futures",
    emoji: "🚀",
    title: "Youth Futures",
    description:
      "What if young people actively designed Newcastle's future? Empowering youth voice in planning, innovation, culture and civic decision-making.",
  },
  {
    id: "education-lifelong-learning",
    emoji: "📚",
    title: "Education & Lifelong Learning",
    description:
      "What if learning extended far beyond formal institutions? Flexible, lifelong education ecosystems linked to community and industry.",
  },
  {
    id: "work-automation",
    emoji: "⚙️",
    title: "Work & Automation",
    description:
      "What if work in Newcastle looked completely different in 2050? Automation, remote work, creative industries and how employment structures might evolve.",
  },
];

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      emoji TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics (id)
    );
  `);

  const upsertTopic = db.prepare(`
    INSERT INTO topics (id, emoji, title, description)
    VALUES (@id, @emoji, @title, @description)
    ON CONFLICT(id) DO UPDATE SET
      emoji = excluded.emoji,
      title = excluded.title,
      description = excluded.description
  `);

  const tx = db.transaction((allTopics) => {
    for (const topic of allTopics) {
      upsertTopic.run(topic);
    }
  });

  tx(topics);
}

initDb();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/topics", (req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        t.id,
        t.emoji,
        t.title,
        t.description,
        COUNT(v.id) AS voteCount
      FROM topics t
      LEFT JOIN votes v ON v.topic_id = t.id
      GROUP BY t.id, t.emoji, t.title, t.description
      ORDER BY t.title COLLATE NOCASE
      `
    )
    .all();

  const totalVotes = rows.reduce((acc, row) => acc + row.voteCount, 0);

  res.json({ topics: rows, totalVotes });
});

app.post("/api/vote", (req, res) => {
  const topicId = req.body?.topicId;

  if (!topicId || typeof topicId !== "string") {
    return res.status(400).json({ error: "A valid topicId is required." });
  }

  const topicExists = db
    .prepare("SELECT id FROM topics WHERE id = ?")
    .get(topicId);

  if (!topicExists) {
    return res.status(404).json({ error: "Topic not found." });
  }

  db.prepare("INSERT INTO votes (topic_id) VALUES (?)").run(topicId);

  const voteCountRow = db
    .prepare("SELECT COUNT(*) AS voteCount FROM votes WHERE topic_id = ?")
    .get(topicId);

  const totalVotesRow = db
    .prepare("SELECT COUNT(*) AS totalVotes FROM votes")
    .get();

  return res.json({
    ok: true,
    topicId,
    voteCount: voteCountRow.voteCount,
    totalVotes: totalVotesRow.totalVotes,
  });
});

app.get("/api/results", (req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        t.id,
        t.title,
        t.emoji,
        COUNT(v.id) AS voteCount
      FROM topics t
      LEFT JOIN votes v ON v.topic_id = t.id
      GROUP BY t.id, t.title, t.emoji
      ORDER BY voteCount DESC, t.title ASC
      `
    )
    .all();

  const totalVotes = rows.reduce((acc, row) => acc + row.voteCount, 0);

  res.json({ results: rows, totalVotes });
});

app.listen(PORT, () => {
  console.log(`TEDxNewy voting demo running at http://localhost:${PORT}`);
});
