import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { HttpError } from "./lib/http.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import genreRoutes from "./routes/genres.js";
import bookRoutes from "./routes/books.js";
import libraryRoutes from "./routes/library.js";
import shelfRoutes from "./routes/shelves.js";
import goalRoutes from "./routes/goals.js";
import profileRoutes from "./routes/profiles.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/shelves", shelfRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/profiles", profileRoutes);

// Express 5 forwards async errors here automatically
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const status = (err as { status?: number }).status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: "Bad request" }); // e.g. malformed JSON
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () =>
  console.log(`The Owl Den API on :${config.port}`),
);
