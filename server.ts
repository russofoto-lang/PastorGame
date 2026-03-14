import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Stato del gioco condiviso
  let gameState = {
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
      // Altri dati specifici per i giochi
    }
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    // Invia lo stato attuale al nuovo connesso
    socket.emit("stateUpdate", gameState);

    // Gestione aggiornamenti dalla Regia
    socket.on("updateState", (newState) => {
      gameState = { ...gameState, ...newState };
      io.emit("stateUpdate", gameState);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
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
          model: "claude-3-5-sonnet-20240620",
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
