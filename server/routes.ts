import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // API health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Audio to Strudel API is running" });
  });

  // Audio processing stats endpoint (for future analytics)
  app.get("/api/stats", (_req, res) => {
    res.json({
      supportedFormats: ["mp3", "wav", "ogg", "flac", "m4a"],
      version: "1.0.0",
      features: {
        melodyExtraction: true,
        chordDetection: true,
        strudelGeneration: true,
      }
    });
  });

  return httpServer;
}
