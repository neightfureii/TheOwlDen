import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../lib/http.js";
import { bookInclude, shapeBook } from "../lib/books.js";
import { ReadingStatus } from "../generated/prisma/client.js";

const router = Router();
router.use(requireAuth);

async function findActive(param: unknown) {
  const username = String(
    Array.isArray(param) ? param[0] : param,
  ).toLowerCase();
  const user = await prisma.user.findFirst({
    where: { username, isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

router.get("/:username", async (req, res) => {
  const user = await findActive(req.params.username);
  const me = req.user!.sub;

  const [follow, statusRows, recent, shelves] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followedId: { followerId: me, followedId: user.id } },
    }),
    prisma.userBook.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
    prisma.userBook.findMany({
      where: { userId: user.id, status: "read" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { rating: true, book: { include: bookInclude } },
    }),
    prisma.shelf.findMany({
      where: { userId: user.id, isPublic: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { entries: true } } },
    }),
  ]);

  const counts = Object.fromEntries(
    Object.values(ReadingStatus).map((s) => [s, 0]),
  ) as Record<string, number>;
  for (const r of statusRows) counts[r.status] = r._count._all;

  res.json({
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      createdAt: user.createdAt,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing: follow !== null,
      isSelf: user.id === me,
    },
    counts,
    recentReads: recent.map((r) => ({
      rating: r.rating,
      book: shapeBook(r.book),
    })),
    shelves,
  });
});

router.put("/:username/follow", async (req, res) => {
  const target = await findActive(req.params.username);
  if (target.id === req.user!.sub)
    throw new HttpError(400, "You can't follow yourself");
  await prisma.follow.createMany({
    data: [{ followerId: req.user!.sub, followedId: target.id }],
    skipDuplicates: true,
  });
  res.json({ ok: true });
});

router.delete("/:username/follow", async (req, res) => {
  const target = await findActive(req.params.username);
  await prisma.follow.deleteMany({
    where: { followerId: req.user!.sub, followedId: target.id },
  });
  res.json({ ok: true });
});

export default router;
