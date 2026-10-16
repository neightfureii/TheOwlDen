import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';

export const bookInclude = {
  authors: { include: { author: true }, orderBy: { position: 'asc' } },
  genres: { include: { genre: true } },
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

export function shapeBook(b: BookWithRelations) {
  const { authors, genres, ...rest } = b;
  return {
    ...rest,
    authors: authors.map((a) => ({ id: a.author.id, name: a.author.name })),
    genres: genres.map((g) => ({ id: g.genre.id, name: g.genre.name, slug: g.genre.slug })),
  };
}

export const entryInclude = { book: { include: bookInclude } } satisfies Prisma.UserBookInclude;

type EntryWithBook = Prisma.UserBookGetPayload<{ include: typeof entryInclude }>;

export function shapeEntry(e: EntryWithBook) {
  const { book, ...rest } = e;
  return { ...rest, book: shapeBook(book) };
}

export const noRating = { avgRating: null as number | null, ratingCount: 0 };

export async function ratingStats(bookIds: number[]) {
  const rows = await prisma.userBook.groupBy({
    by: ['bookId'],
    where: { bookId: { in: bookIds }, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    rows.map((r) => [
      r.bookId,
      {
        avgRating: r._avg.rating === null ? null : Math.round(r._avg.rating * 100) / 100,
        ratingCount: r._count.rating,
      },
    ])
  );
}