import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

const VOICE_MAP: Record<string, string> = {
  Charon: "es-AR-TomasNeural",
  Puck: "es-AR-TomasNeural",
  Fenrir: "es-AR-TomasNeural",
  Kore: "es-AR-ElenaNeural",
  Zephyr: "es-AR-ElenaNeural",
  Jorge: "es-MX-JorgeNeural",
  Dalia: "es-MX-DaliaNeural",
  Lorenzo: "es-CL-LorenzoNeural",
  Valentina: "es-UY-ValentinaNeural",
  Mateo: "es-UY-MateoNeural",
};

function parseSegments(script: string): { speaker: string; text: string }[] {
  const lines = script.split("\n").filter((l) => l.trim());
  const segments: { speaker: string; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[PAUSA/i.test(trimmed)) continue;

    const match = trimmed.match(/^Speaker\s+([A-Z]):\s*(.*)/i);
    if (match) {
      segments.push({ speaker: match[1].toUpperCase(), text: match[2] });
    } else if (segments.length > 0) {
      segments[segments.length - 1].text += " " + trimmed;
    }
  }
  return segments;
}

app.post("/api/tts", async (req, res) => {
  try {
    const { text, mode, speakers } = req.body;

    let pythonConfig: any;

    if (mode === "conversation" && speakers) {
      const segments = parseSegments(text);

      const speakerMap: Record<string, { voice: string; pitch: string; rate: string }> = {};
      for (const spk of speakers) {
        speakerMap[spk.label.replace("Speaker ", "")] = {
          voice: VOICE_MAP[spk.voice] || "es-AR-ElenaNeural",
          pitch: spk.pitch || "+0st",
          rate: spk.rate || "+0%",
        };
      }

      pythonConfig = {
        mode: "conversation",
        segments: segments.map((s) => {
          const cfg = speakerMap[s.speaker] || { voice: "es-AR-ElenaNeural", pitch: "+0st", rate: "+0%" };
          return { voice: cfg.voice, text: s.text, pitch: cfg.pitch, rate: cfg.rate };
        }),
      };
    } else {
      const spk = { voice: req.body.voice || "Kore", pitch: req.body.pitch || "+0st", rate: req.body.rate || "+0%" };
      pythonConfig = {
        mode: "single",
        text: text,
        voice: VOICE_MAP[spk.voice] || "es-AR-ElenaNeural",
        pitch: spk.pitch,
        rate: spk.rate,
      };
    }

    console.log(`edge-tts → ${JSON.stringify(pythonConfig).substring(0, 300)}...`);

    const proc = spawn("python", ["tts_helper.py"], { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("edge-tts err:", stderr);
        res.status(500).json({ error: `edge-tts falló (${code}): ${stderr}` });
        return;
      }
      res.json({
        success: true,
        audioSrc: `data:audio/mp3;base64,${stdout.trim()}`,
        text: text.substring(0, 300),
      });
    });

    proc.on("error", (err) => {
      res.status(500).json({ error: "No se pudo iniciar edge-tts. ¿Python instalado?" });
    });

    proc.stdin.write(JSON.stringify(pythonConfig));
    proc.stdin.end();
  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "Error en síntesis." });
  }
});

async function bindServer() {
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
    console.log(`EP_TTS → http://localhost:${PORT}`);
  });
}

bindServer();
