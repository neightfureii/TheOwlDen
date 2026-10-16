import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  HttpError,
  idParam,
  optDate,
  optInt,
  optText,
  queryString,
} from "../lib/http.js";
import { entryInclude, shapeEntry } from "../lib/books.js";
import { ReadingStatus } from "../generated/prisma/client.js";

const router = Router();
router.use(requireAuth);

const STATUSES: string[] = Object.values(ReadingStatus);

interface Fields {
  status?: ReadingStatus;
  rating?: number | null;
  review?: string | null;
  reviewIsPublic?: boolean;
  currentPage?: number;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

router.get("/", async (req, res) => {
  const status = queryString(req.query.status);
  if (status && !STATUSES.includes(status))
    throw new HttpError(400, "Invalid status");

  const entries = await prisma.userBook.findMany({
    where: {
      userId: req.user!.sub,
      ...(status ? { status: status as ReadingStatus } : {}),
    },
    include: entryInclude,
    orderBy: { updatedAt: "desc" },
  });
  res.json({ entries: entries.map(shapeEntry) });
});

router.get("/summary", async (req, res) => {
  const rows = await prisma.userBook.groupBy({
    by: ["status"],
    where: { userId: req.user!.sub },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    string,
    number
  >;
  for (const r of rows) counts[r.status] = r._count._all;
  res.json({ counts });
});

// Create or update my entry for a book (partial updates are fine)
router.put("/:bookId", async (req, res) => {
  const bookId = idParam(req.params.bookId);
  const userId = req.user!.sub;
  const body = req.body ?? {};

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new HttpError(404, "Book not found");
  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  const fields: Fields = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status))
      throw new HttpError(400, "Invalid status");
    fields.status = body.status;
  }
  if (body.rating !== undefined) {
    fields.rating =
      body.rating === null ? null : optInt(body.rating, "Rating", 1, 5);
  }
  if (body.review !== undefined)
    fields.review = optText(body.review, "Review", 10000);
  if (body.reviewIsPublic !== undefined) {
    if (typeof body.reviewIsPublic !== "boolean")
      throw new HttpError(400, "Invalid reviewIsPublic");
    fields.reviewIsPublic = body.reviewIsPublic;
  }
  if (body.currentPage !== undefined) {
    fields.currentPage = optInt(body.currentPage, "Current page", 0, 100000);
  }
  if (body.startedAt !== undefined)
    fields.startedAt = optDate(body.startedAt, "Start date");
  if (body.finishedAt !== undefined)
    fields.finishedAt = optDate(body.finishedAt, "Finish date");

  // Convenience rules when the status changes
  const today = new Date(new Date().toISOString().slice(0, 10));
  if (fields.status) {
    if (
      fields.status === "reading" &&
      fields.startedAt === undefined &&
      !existing?.startedAt
    ) {
      fields.startedAt = today;
    }
    if (fields.status === "read") {
      if (fields.finishedAt === undefined && !existing?.finishedAt)
        fields.finishedAt = today;
      if (fields.currentPage === undefined && book.pageCount)
        fields.currentPage = book.pageCount;
    } else if (fields.finishedAt === undefined && existing?.finishedAt) {
      fields.finishedAt = null;
    }
  }
  if (fields.currentPage !== undefined && book.pageCount) {
    fields.currentPage = Math.min(fields.currentPage, book.pageCount);
  }

  const start =
    fields.startedAt !== undefined
      ? fields.startedAt
      : (existing?.startedAt ?? null);
  const finish =
    fields.finishedAt !== undefined
      ? fields.finishedAt
      : (existing?.finishedAt ?? null);
  if (start && finish && finish.getTime() < start.getTime()) {
    throw new HttpError(400, "Finish date cannot be before the start date");
  }

  const entry = await prisma.userBook.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, ...fields },
    update: fields,
    include: entryInclude,
  });
  res.json({ entry: shapeEntry(entry) });
});

router.delete("/:bookId", async (req, res) => {
  const bookId = idParam(req.params.bookId);
  await prisma.userBook.deleteMany({
    where: { userId: req.user!.sub, bookId },
  });
  res.json({ ok: true });
});

export default router;
