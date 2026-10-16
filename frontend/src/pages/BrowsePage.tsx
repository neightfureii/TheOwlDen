import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BookRow from "../components/BookRow";
import { api, errMsg, type Book, type Genre } from "../api";

interface BooksResponse {
  books: Book[];
  total: number;
  page: number;
  pageSize: number;
}

export default function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const genre = params.get("genre") ?? "";
  const page = Number(params.get("page")) || 1;

  const [text, setText] = useState(q);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [data, setData] = useState<BooksResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ genres: Genre[] }>("/genres")
      .then((d) => setGenres(d.genres))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ page: String(page) });
    if (q) qs.set("q", q);
    if (genre) qs.set("genre", genre);
    api<BooksResponse>(`/books?${qs}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(errMsg(e)));
    return () => {
      cancelled = true;
    };
  }, [q, genre, page]);

  function update(next: { q?: string; genre?: string; page?: number }) {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    const ng = next.genre ?? genre;
    const np = next.page ?? 1;
    if (nq) p.set("q", nq);
    if (ng) p.set("genre", ng);
    if (np > 1) p.set("page", String(np));
    setParams(p);
  }

  function search(e: FormEvent) {
    e.preventDefault();
    update({ q: text });
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <>
      <h2>Browse books</h2>
      <form onSubmit={search} className="inline-form">
        <input
          placeholder="Title, author or ISBN"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select
          value={genre}
          onChange={(e) => update({ genre: e.target.value })}
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <button>Search</button>
        <Link to="/books/new">Add a book</Link>
      </form>

      {error && <p className="error">{error}</p>}
      {data === null ? (
        <p>Loading…</p>
      ) : data.books.length === 0 ? (
        <p className="muted">
          No books found. <Link to="/books/new">Add it to the catalog.</Link>
        </p>
      ) : (
        data.books.map((b) => <BookRow key={b.id} book={b} />)
      )}

      {data && totalPages > 1 && (
        <p>
          <button
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
          >
            Previous
          </button>{" "}
          Page {page} of {totalPages}{" "}
          <button
            disabled={page >= totalPages}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </button>
        </p>
      )}
    </>
  );
}
