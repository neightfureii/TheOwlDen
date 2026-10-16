import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, optInt } from "../lib/http.js";

const router = Router();
router.use(requireAuth);

function yearParam(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(n) || n < 2000 || n > 2100)
    throw new HttpError(400, "Invalid year");
  return n;
}

async function goalFor(userId: number, year: number) {
  const [goal, booksRead] = await Promise.all([
    prisma.readingGoal.findUnique({ where: { userId_year: { userId, year } } }),
    prisma.userBook.count({
      where: {
        userId,
        status: "read",
        finishedAt: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
    }),
  ]);
  return { year, targetBooks: goal?.targetBooks ?? null, booksRead };
}

router.get("/:year", async (req, res) => {
  res.json(await goalFor(req.user!.sub, yearParam(req.params.year)));
});

router.put("/:year", async (req, res) => {
  const userId = req.user!.sub;
  const year = yearParam(req.params.year);
  const targetBooks = optInt(req.body?.targetBooks, "Target", 1, 1000);
  if (targetBooks === undefined) throw new HttpError(400, "Target is required");
  await prisma.readingGoal.upsert({
    where: { userId_year: { userId, year } },
    create: { userId, year, targetBooks },
    update: { targetBooks },
  });
  res.json(await goalFor(userId, year));
});

export default router;
