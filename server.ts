import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

function logToFile(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(path.join(process.cwd(), "server.log"), `[${timestamp}] ${msg}\n`);
  console.log(msg);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const PORT = 3000;

  let gameState: any = {
    mode: 'home',
    teams: [
      { id: 1, name: 'Team A', score: 0, color: 'bg-retro-pink' },
      { id: 2, name: 'Team B', score: 0, color: 'bg-retro-cyan' },
      { id: 3, name: 'Team C', score: 0, color: 'bg-retro-yellow' },
    ],
    gameData: {
      currentIndex: 0,
      showAnswer: false,
      selectedOption: null,
      topic: '',
      questions: [],
    }
  };

  io.on("connection", (socket) => {
    logToFile(`User connected: ${socket.id}`);
    socket.emit("stateUpdate", gameState);

    socket.on("updateState", (newState: any) => {
      // Il timer NON viaggia più via socket (gestito localmente nel client Duellos),
      // quindi non esistono più race condition sul timer.
      // Ogni update dal client include sempre gameData completo con spread,
      // quindi il merge shallow è sufficiente e sicuro.
      if (newState.gameData) {
        gameState.gameData = { ...gameState.gameData, ...newState.gameData };
      }

      // Merge del resto (mode, teams, ecc.)
      const { gameData, ...restState } = newState;
      gameState = { ...gameState, ...restState };

      logToFile(
        `[SERVER] stateUpdate → mode=${gameState.mode} ` +
        `phase=${gameState.gameData?.phase} ` +
        `wordIdx=${gameState.gameData?.currentWordIndex} ` +
        `wordRevealed=${gameState.gameData?.wordRevealed}`
      );

      io.emit("stateUpdate", gameState);
    });

    socket.on("disconnect", () => {
      logToFile("User disconnected");
    });
  });

  // Endpoint per Claude (Anthropic)
  app.post("/api/claude", async (req, res) => {
    const { prompt, system } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata nel server." });
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: system,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      res.json({ text: data.content[0].text });
    } catch (error: any) {
      console.error("Claude API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
