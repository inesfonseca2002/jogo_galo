import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface ScoreEntry {
  id: string;
  playerName: string;
  difficulty: "easy" | "medium" | "hard";
  movesCount: number;
  timestamp: string;
}

const DB_FILE = path.join(process.cwd(), "scores.json");

// Helper to read database safely
function readDatabase(): ScoreEntry[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data) || [];
  } catch (error) {
    console.error("Erro ao ler base de dados de pontuações:", error);
    return [];
  }
}

// Helper to write database safely
function writeDatabase(data: ScoreEntry[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao escrever na base de dados de pontuações:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON body parser
  app.use(express.json());

  // API endpoints
  app.get("/api/scores", (req, res) => {
    try {
      const scores = readDatabase();
      res.json(scores);
    } catch (err) {
      res.status(500).json({ error: "Erro ao obter registos de pontuações" });
    }
  });

  app.post("/api/scores", (req, res) => {
    try {
      const { playerName, difficulty, movesCount } = req.body;
      
      if (!playerName || typeof playerName !== "string" || !playerName.trim()) {
        res.status(400).json({ error: "O nome do jogador é obrigatório" });
        return;
      }
      
      if (!difficulty || !["easy", "medium", "hard"].includes(difficulty)) {
        res.status(400).json({ error: "Dificuldade inválida" });
        return;
      }

      if (typeof movesCount !== "number" || movesCount < 3 || movesCount > 9) {
        res.status(400).json({ error: "Contagem de jogadas inválida" });
        return;
      }

      const scores = readDatabase();
      const newEntry: ScoreEntry = {
        id: Math.random().toString(36).substring(2, 9),
        playerName: playerName.trim().substring(0, 25), // limit length for UX
        difficulty: difficulty as any,
        movesCount,
        timestamp: new Date().toISOString()
      };

      scores.push(newEntry);
      writeDatabase(scores);

      res.status(201).json(newEntry);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao guardar a pontuação" });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
