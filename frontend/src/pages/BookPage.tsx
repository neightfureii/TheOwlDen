import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Stars from '../components/Stars';
import {
  api, dateOnly, errMsg, STATUSES, STATUS_LABELS,
  type Book, type LibraryEntry, type Shelf,
} from '../api';
import { useAuth } from '../auth/AuthContext';

type MyEntry = Omit<LibraryEntry, 'book'> & { shelfIds: number[] };

interface BookDetail {
  book: Book;
  mine: MyEntry | null;
  reviews: {
    rating: number | null;
    review: string;
    updatedAt: string;
    user: { id: number; username: string; displayName: string };
  }[];
}

export default function BookPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'moderator' || user?.role === 'admin';

  const [data, setData] = useState<BookDetail | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [error, setError] = useState('');
  const [review, setReview] = useState('');
  const [reviewPublic, setReviewPublic] = useState(true);
  const [page, setPage] = useState('0');
  const [started, setStarted] = useState('');
  const [finished, setFinished] = useState('');

  const load = useCallback(async () => {
    const d = await api<BookDetail>(`/books/${id}`);
    setData(d);
    setReview(d.mine?.review ?? '');
    setReviewPublic(d.mine?.reviewIsPublic ?? true);
    setPage(String(d.mine?.currentPage ?? 0));
    setStarted(dateOnly(d.mine?.startedAt));
    setFinished(dateOnly(d.mine?.finishedAt));
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
    api<{ shelves: Shelf[] }>('/shelves').then((d) => setShelves(d.shelves)).catch(() => {});
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  const save = (patch: Record<string, unknown>) =>
    run(() => api(`/library/${id}`, { method: 'PUT', body: JSON.stringify(patch) }));

  const remove = () => {
    if (confirm('Remove this book from your library? Your rating and review will be lost.')) {
      void run(() => api(`/library/${id}`, { method: 'DELETE' }));
    }
  };

  const toggleShelf = (shelfId: number, on: boolean) =>
    run(() => api(`/shelves/${shelfId}/books/${id}`, { method: on ? 'PUT' : 'DELETE' }));

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { book, mine, reviews } = data;

  return (
    <>
      <div className="book-row">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt="" className="cover large" />
        ) : (
          <div className="cover large placeholder">No cover</div>
        )}
        <div>
          <h2 style={{ margin: 0 }}>{book.title}</h2>
          {book.subtitle && <div className="muted">{book.subtitle}</div>}
          <div>by {book.authors.map((a) => a.name).join(', ')}</div>
          {book.avgRating != null && (
            <div>
              ★ {book.avgRating.toFixed(2)} <span className="muted">({book.ratingCount} ratings)</span>
            </div>
          )}
          <div className="muted">
            {[
              book.pageCount && `${book.pageCount} pages`,
              book.publisher,
              book.publishedOn && dateOnly(book.publishedOn),
              book.isbn13 && `ISBN ${book.isbn13}`,
            ].filter(Boolean).join(' · ')}
          </div>
          <div className="muted">{book.genres.map((g) => g.name).join(', ')}</div>
          {canEdit && <Link to={`/books/${book.id}/edit`}>Edit book</Link>}
        </div>
      </div>

      {book.description && <p style={{ whiteSpace: 'pre-wrap' }}>{book.description}</p>}
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h3>My shelf</h3>
        <select
          value={mine?.status ?? ''}
          onChange={(e) => {
            if (e.target.value) void save({ status: e.target.value });
          }}
        >
          {!mine && <option value="">Add to my books…</option>}
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {mine && (
          <>
            <p>
              Rating: <Stars value={mine.rating} onChange={(v) => void save({ rating: v })} />
            </p>

            <div className="inline-form">
              <label>
                Page{' '}
                <input type="number" min="0" value={page} onChange={(e) => setPage(e.target.value)} style={{ width: 90 }} />
                {book.pageCount ? ` / ${book.pageCount}` : ''}
              </label>
              <button onClick={() => void save({ currentPage: Number(page) })}>Save progress</button>
            </div>

            <div className="inline-form">
              <label>
                Started <input type="date" value={started} onChange={(e) => setStarted(e.target.value)} />
              </label>
              <label>
                Finished <input type="date" value={finished} onChange={(e) => setFinished(e.target.value)} />
              </label>
              <button onClick={() => void save({ startedAt: started || null, finishedAt: finished || null })}>
                Save dates
              </button>
            </div>

            <h4>My review</h4>
            <textarea rows={5} style={{ width: '100%' }} value={review} onChange={(e) => setReview(e.target.value)} />
            <div className="inline-form">
              <label>
                <input type="checkbox" checked={reviewPublic} onChange={(e) => setReviewPublic(e.target.checked)} /> Public
              </label>
              <button onClick={() => void save({ review, reviewIsPublic: reviewPublic })}>Save review</button>
            </div>

            <h4>Custom shelves</h4>
            {shelves.length === 0 ? (
              <p className="muted">
                You have no custom shelves. <Link to="/shelves">Create one.</Link>
              </p>
            ) : (
              shelves.map((s) => (
                <label key={s.id} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={mine.shelfIds.includes(s.id)}
                    onChange={(e) => void toggleShelf(s.id, e.target.checked)}
                  />{' '}
                  {s.name}
                </label>
              ))
            )}

            <p>
              <button onClick={remove}>Remove from my books</button>
            </p>
          </>
        )}
      </section>

      <h3>Reviews</h3>
      {reviews.length === 0 ? (
        <p className="muted">No public reviews yet.</p>
      ) : (
        reviews.map((r, i) => (
          <div key={i} className="review">
            <Link to={`/u/${r.user.username}`}>{r.user.displayName}</Link>{' '}
            {r.rating && <Stars value={r.rating} />}
            <p style={{ whiteSpace: 'pre-wrap' }}>{r.review}</p>
          </div>
        ))
      )}
    </>
  );
}