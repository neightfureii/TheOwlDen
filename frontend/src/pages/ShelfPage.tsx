import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BookRow from '../components/BookRow';
import Stars from '../components/Stars';
import { api, errMsg, STATUS_LABELS, type Book, type ReadingStatus } from '../api';

interface ShelfData {
  shelf: {
    id: number;
    name: string;
    isPublic: boolean;
    isOwner: boolean;
    owner: { username: string; displayName: string };
  };
  books: (Book & { status: ReadingStatus; rating: number | null })[];
}

export default function ShelfPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ShelfData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setData(await api<ShelfData>(`/shelves/${id}`));
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { shelf, books } = data;

  return (
    <>
      <h2>{shelf.name}</h2>
      <p className="muted">
        by <Link to={`/u/${shelf.owner.username}`}>{shelf.owner.displayName}</Link> ·{' '}
        {shelf.isPublic ? 'public' : 'private'}
      </p>
      {error && <p className="error">{error}</p>}

      {shelf.isOwner && (
        <p className="inline-form">
          <button
            onClick={() =>
              void run(async () => {
                await api(`/shelves/${shelf.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ isPublic: !shelf.isPublic }),
                });
                await load();
              })
            }
          >
            Make {shelf.isPublic ? 'private' : 'public'}
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this shelf? The books stay in your library.')) {
                void run(async () => {
                  await api(`/shelves/${shelf.id}`, { method: 'DELETE' });
                  navigate('/shelves');
                });
              }
            }}
          >
            Delete shelf
          </button>
        </p>
      )}

      {books.length === 0 ? (
        <p className="muted">This shelf is empty.</p>
      ) : (
        books.map((b) => (
          <BookRow key={b.id} book={b}>
            <div className="muted">{STATUS_LABELS[b.status]}</div>
            {b.rating && <Stars value={b.rating} />}
            {shelf.isOwner && (
              <button
                onClick={() =>
                  void run(async () => {
                    await api(`/shelves/${shelf.id}/books/${b.id}`, { method: 'DELETE' });
                    await load();
                  })
                }
              >
                Remove from shelf
              </button>
            )}
          </BookRow>
        ))
      )}
    </>
  );
}