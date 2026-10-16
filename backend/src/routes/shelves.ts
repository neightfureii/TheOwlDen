import { Router, type Request } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, idParam, optText, prismaCode } from '../lib/http.js';
import { bookInclude, shapeBook } from '../lib/books.js';

const router = Router();
router.use(requireAuth);

async function ownShelf(req: Request, idValue: unknown) {
  const id = idParam(idValue);
  const shelf = await prisma.shelf.findFirst({ where: { id, userId: req.user!.sub } });
  if (!shelf) throw new HttpError(404, 'Shelf not found');
  return shelf;
}

router.get('/', async (req, res) => {
  const shelves = await prisma.shelf.findMany({
    where: { userId: req.user!.sub },
    orderBy: { name: 'asc' },
    include: { _count: { select: { entries: true } } },
  });
  res.json({ shelves });
});

router.post('/', async (req, res) => {
  const name = optText(req.body?.name, 'Name', 60);
  if (!name) throw new HttpError(400, 'Name is required');
  const isPublic = req.body?.isPublic === undefined ? true : req.body.isPublic;
  if (typeof isPublic !== 'boolean') throw new HttpError(400, 'Invalid isPublic');
  try {
    const shelf = await prisma.shelf.create({
      data: { userId: req.user!.sub, name, isPublic },
      include: { _count: { select: { entries: true } } },
    });
    res.status(201).json({ shelf });
  } catch (err) {
    if (prismaCode(err) === 'P2002') throw new HttpError(409, 'You already have a shelf with that name');
    throw err;
  }
});

// Owner can always view; others only if the shelf is public
router.get('/:id', async (req, res) => {
  const id = idParam(req.params.id);
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, displayName: true } },
      entries: {
        orderBy: { addedAt: 'desc' },
        include: {
          userBook: { select: { status: true, rating: true, book: { include: bookInclude } } },
        },
      },
    },
  });
  const isOwner = shelf?.userId === req.user!.sub;
  if (!shelf || (!isOwner && !shelf.isPublic)) throw new HttpError(404, 'Shelf not found');

  res.json({
    shelf: { id: shelf.id, name: shelf.name, isPublic: shelf.isPublic, isOwner, owner: shelf.user },
    books: shelf.entries.map((e) => ({
      ...shapeBook(e.userBook.book),
      status: e.userBook.status,
      rating: e.userBook.rating,
    })),
  });
});

router.patch('/:id', async (req, res) => {
  const shelf = await ownShelf(req, req.params.id);
  const name = optText(req.body?.name, 'Name', 60);
  if (name === null) throw new HttpError(400, 'Name cannot be empty');
  const { isPublic } = req.body ?? {};
  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw new HttpError(400, 'Invalid isPublic');
  }
  try {
    const updated = await prisma.shelf.update({ where: { id: shelf.id }, data: { name, isPublic } });
    res.json({ shelf: updated });
  } catch (err) {
    if (prismaCode(err) === 'P2002') throw new HttpError(409, 'You already have a shelf with that name');
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const shelf = await ownShelf(req, req.params.id);
  await prisma.shelf.delete({ where: { id: shelf.id } });
  res.json({ ok: true });
});

router.put('/:id/books/:bookId', async (req, res) => {
  const shelf = await ownShelf(req, req.params.id);
  const bookId = idParam(req.params.bookId);
  const entry = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId: req.user!.sub, bookId } },
    select: { id: true },
  });
  if (!entry) throw new HttpError(400, 'Add the book to your library before shelving it');
  await prisma.shelfEntry.createMany({
    data: [{ shelfId: shelf.id, userBookId: entry.id }],
    skipDuplicates: true,
  });
  res.json({ ok: true });
});

router.delete('/:id/books/:bookId', async (req, res) => {
  const shelf = await ownShelf(req, req.params.id);
  const bookId = idParam(req.params.bookId);
  await prisma.shelfEntry.deleteMany({
    where: { shelfId: shelf.id, userBook: { bookId, userId: req.user!.sub } },
  });
  res.json({ ok: true });
});

export default router;