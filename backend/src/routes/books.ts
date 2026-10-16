import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  HttpError, idParam, optDate, optInt, optText, prismaCode, queryString,
} from '../lib/http.js';
import { bookInclude, noRating, ratingStats, shapeBook } from '../lib/books.js';

const router = Router();
router.use(requireAuth);

interface BookInput {
  title: string;
  subtitle: string | null;
  description: string | null;
  isbn13: string | null;
  pageCount: number | null;
  publisher: string | null;
  publishedOn: Date | null;
  language: string;
  coverUrl: string | null;
  authors: string[];
  genreIds: number[];
}

function parseBookInput(body: any): BookInput {
  const title = optText(body.title, 'Title', 300);
  if (!title) throw new HttpError(400, 'Title is required');

  if (!Array.isArray(body.authors)) throw new HttpError(400, 'At least one author is required');
  const authors = [
    ...new Set(
      body.authors
        .map((a: unknown) => (typeof a === 'string' ? a.trim() : ''))
        .filter((a: string) => a !== '')
    ),
  ] as string[];
  if (authors.length === 0 || authors.length > 10) {
    throw new HttpError(400, 'Provide between 1 and 10 authors');
  }
  if (authors.some((a) => a.length > 200)) throw new HttpError(400, 'Author name too long');

  let isbn13: string | null = null;
  const rawIsbn = optText(body.isbn13, 'ISBN', 20);
  if (rawIsbn) {
    isbn13 = rawIsbn.replace(/[-\s]/g, '');
    if (!/^\d{13}$/.test(isbn13)) throw new HttpError(400, 'ISBN-13 must be 13 digits');
  }

  const coverUrl = optText(body.coverUrl, 'Cover URL', 500) ?? null;
  if (coverUrl && !/^https?:\/\//i.test(coverUrl)) {
    throw new HttpError(400, 'Cover URL must start with http:// or https://');
  }

  const rawGenres: unknown[] = Array.isArray(body.genreIds) ? body.genreIds : [];
  if (rawGenres.some((g) => typeof g !== 'number' || !Number.isInteger(g) || g <= 0)) {
    throw new HttpError(400, 'Invalid genre');
  }

  return {
    title,
    subtitle: optText(body.subtitle, 'Subtitle', 300) ?? null,
    description: optText(body.description, 'Description', 10000) ?? null,
    isbn13,
    pageCount: body.pageCount == null ? null : optInt(body.pageCount, 'Page count', 1, 20000) ?? null,
    publisher: optText(body.publisher, 'Publisher', 200) ?? null,
    publishedOn: optDate(body.publishedOn, 'Published date') ?? null,
    language: optText(body.language, 'Language', 10) ?? 'en',
    coverUrl,
    authors,
    genreIds: [...new Set(rawGenres as number[])],
  };
}

const scalars = ({ authors: _a, genreIds: _g, ...rest }: BookInput) => rest;

// Reuse an existing author with the same name, otherwise create one
async function authorIdsFor(tx: Prisma.TransactionClient, names: string[]): Promise<number[]> {
  const ids = new Set<number>();
  for (const name of names) {
    const found = await tx.author.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    ids.add(found ? found.id : (await tx.author.create({ data: { name } })).id);
  }
  return [...ids];
}

function bookError(err: unknown): never {
  const code = prismaCode(err);
  if (code === 'P2002') throw new HttpError(409, 'A book with that ISBN already exists');
  if (code === 'P2025') throw new HttpError(400, 'Unknown genre');
  throw err;
}

router.get('/', async (req, res) => {
  const q = queryString(req.query.q);
  const genre = queryString(req.query.genre);
  const page = Math.max(1, Number(queryString(req.query.page)) || 1);
  const pageSize = 20;

  const where: Prisma.BookWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { authors: { some: { author: { name: { contains: q, mode: 'insensitive' } } } } },
              { isbn13: q },
            ],
          }
        : {},
      genre ? { genres: { some: { genre: { slug: genre } } } } : {},
    ],
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      include: bookInclude,
      orderBy: { title: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.book.count({ where }),
  ]);
  const stats = await ratingStats(books.map((b) => b.id));

  res.json({
    books: books.map((b) => ({ ...shapeBook(b), ...(stats.get(b.id) ?? noRating) })),
    total,
    page,
    pageSize,
  });
});

router.get('/:id', async (req, res) => {
  const id = idParam(req.params.id);
  const book = await prisma.book.findUnique({ where: { id }, include: bookInclude });
  if (!book) throw new HttpError(404, 'Book not found');

  const [stats, mine, reviews] = await Promise.all([
    ratingStats([id]),
    prisma.userBook.findUnique({
      where: { userId_bookId: { userId: req.user!.sub, bookId: id } },
      include: { shelfEntries: { select: { shelfId: true } } },
    }),
    prisma.userBook.findMany({
      where: { bookId: id, reviewIsPublic: true, review: { not: null }, user: { isActive: true } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        rating: true,
        review: true,
        updatedAt: true,
        user: { select: { id: true, username: true, displayName: true } },
      },
    }),
  ]);

  let mineOut = null;
  if (mine) {
    const { shelfEntries, ...rest } = mine;
    mineOut = { ...rest, shelfIds: shelfEntries.map((s) => s.shelfId) };
  }

  res.json({
    book: { ...shapeBook(book), ...(stats.get(id) ?? noRating) },
    mine: mineOut,
    reviews,
  });
});

// Any member can add a book to the catalog
router.post('/', async (req, res) => {
  const input = parseBookInput(req.body ?? {});
  try {
    const book = await prisma.$transaction(async (tx) => {
      const authorIds = await authorIdsFor(tx, input.authors);
      return tx.book.create({
        data: {
          ...scalars(input),
          addedBy: { connect: { id: req.user!.sub } },
          authors: {
            create: authorIds.map((authorId, position) => ({
              position,
              author: { connect: { id: authorId } },
            })),
          },
          genres: {
            create: input.genreIds.map((genreId) => ({ genre: { connect: { id: genreId } } })),
          },
        },
        include: bookInclude,
      });
    });
    res.status(201).json({ book: shapeBook(book) });
  } catch (err) {
    bookError(err);
  }
});

// Only moderators and admins can edit catalog entries
router.put('/:id', requireRole('moderator', 'admin'), async (req, res) => {
  const id = idParam(req.params.id);
  const input = parseBookInput(req.body ?? {});
  const exists = await prisma.book.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, 'Book not found');

  try {
    const book = await prisma.$transaction(async (tx) => {
      const authorIds = await authorIdsFor(tx, input.authors);
      await tx.bookAuthor.deleteMany({ where: { bookId: id } });
      await tx.bookGenre.deleteMany({ where: { bookId: id } });
      return tx.book.update({
        where: { id },
        data: {
          ...scalars(input),
          authors: {
            create: authorIds.map((authorId, position) => ({
              position,
              author: { connect: { id: authorId } },
            })),
          },
          genres: {
            create: input.genreIds.map((genreId) => ({ genre: { connect: { id: genreId } } })),
          },
        },
        include: bookInclude,
      });
    });
    res.json({ book: shapeBook(book) });
  } catch (err) {
    bookError(err);
  }
});

export default router;