export type Role = 'member' | 'moderator' | 'admin';
export type ReadingStatus = 'want_to_read' | 'reading' | 'read' | 'did_not_finish';

export const STATUSES: ReadingStatus[] = ['want_to_read', 'reading', 'read', 'did_not_finish'];
export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to read',
  reading: 'Currently reading',
  read: 'Read',
  did_not_finish: 'Did not finish',
};

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  role: Role;
}

export interface Author { id: number; name: string }
export interface Genre { id: number; name: string; slug: string }

export interface Book {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  isbn13: string | null;
  pageCount: number | null;
  publisher: string | null;
  publishedOn: string | null;
  language: string;
  coverUrl: string | null;
  authors: Author[];
  genres: Genre[];
  avgRating?: number | null;
  ratingCount?: number;
}

export interface LibraryEntry {
  id: number;
  bookId: number;
  status: ReadingStatus;
  rating: number | null;
  review: string | null;
  reviewIsPublic: boolean;
  currentPage: number;
  startedAt: string | null;
  finishedAt: string | null;
  book: Book;
}

export interface Shelf {
  id: number;
  name: string;
  isPublic: boolean;
  _count: { entries: number };
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed');
  return data as T;
}

export const errMsg = (err: unknown): string =>
  err instanceof Error ? err.message : 'Something went wrong';

export const dateOnly = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : '');