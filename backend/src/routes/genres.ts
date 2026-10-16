import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError, optText, prismaCode } from "../lib/http.js";
import { slugify } from "../lib/slug.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });
  res.json({ genres });
});

router.post("/", requireRole("moderator", "admin"), async (req, res) => {
  const name = optText(req.body?.name, "Name", 60);
  if (!name) throw new HttpError(400, "Name is required");
  const slug = slugify(name);
  if (!slug) throw new HttpError(400, "Name must contain letters or numbers");
  try {
    const genre = await prisma.genre.create({ data: { name, slug } });
    res.status(201).json({ genre });
  } catch (err) {
    if (prismaCode(err) === "P2002")
      throw new HttpError(409, "Genre already exists");
    throw err;
  }
});

export default router;
