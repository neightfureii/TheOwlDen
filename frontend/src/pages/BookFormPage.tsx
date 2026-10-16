import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, dateOnly, errMsg, type Book, type Genre } from "../api";

const empty = {
  title: "",
  subtitle: "",
  authors: "",
  isbn13: "",
  pageCount: "",
  publisher: "",
  publishedOn: "",
  language: "en",
  coverUrl: "",
  description: "",
};

export default function BookFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ genres: Genre[] }>("/genres")
      .then((d) => setGenres(d.genres))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api<{ book: Book }>(`/books/${id}`)
      .then(({ book }) => {
        setForm({
          title: book.title,
          subtitle: book.subtitle ?? "",
          authors: book.authors.map((a) => a.name).join(", "),
          isbn13: book.isbn13 ?? "",
          pageCount: book.pageCount ? String(book.pageCount) : "",
          publisher: book.publisher ?? "",
          publishedOn: dateOnly(book.publishedOn),
          language: book.language,
          coverUrl: book.coverUrl ?? "",
          description: book.description ?? "",
        });
        setGenreIds(book.genres.map((g) => g.id));
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  const set =
    (field: keyof typeof empty) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      authors: form.authors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      isbn13: form.isbn13,
      pageCount: form.pageCount ? Number(form.pageCount) : null,
      publisher: form.publisher,
      publishedOn: form.publishedOn || null,
      language: form.language,
      coverUrl: form.coverUrl,
      description: form.description,
      genreIds,
    };
    try {
      const { book } = await api<{ book: Book }>(
        id ? `/books/${id}` : "/books",
        {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      navigate(`/books/${book.id}`);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <>
      <h2>{id ? "Edit book" : "Add a book"}</h2>
      <form onSubmit={submit} className="form-grid" style={{ maxWidth: 520 }}>
        <input
          placeholder="Title *"
          value={form.title}
          onChange={set("title")}
          required
        />
        <input
          placeholder="Subtitle"
          value={form.subtitle}
          onChange={set("subtitle")}
        />
        <input
          placeholder="Authors * (comma-separated)"
          value={form.authors}
          onChange={set("authors")}
          required
        />
        <input
          placeholder="ISBN-13"
          value={form.isbn13}
          onChange={set("isbn13")}
        />
        <input
          type="number"
          min="1"
          placeholder="Pages"
          value={form.pageCount}
          onChange={set("pageCount")}
        />
        <input
          placeholder="Publisher"
          value={form.publisher}
          onChange={set("publisher")}
        />
        <label>
          Published{" "}
          <input
            type="date"
            value={form.publishedOn}
            onChange={set("publishedOn")}
          />
        </label>
        <input
          placeholder="Language code (e.g. en)"
          value={form.language}
          onChange={set("language")}
        />
        <input
          placeholder="Cover image URL"
          value={form.coverUrl}
          onChange={set("coverUrl")}
        />
        <textarea
          rows={5}
          placeholder="Description"
          value={form.description}
          onChange={set("description")}
        />

        <fieldset>
          <legend>Genres</legend>
          {genres.map((g) => (
            <label
              key={g.id}
              style={{ display: "inline-block", marginRight: 12 }}
            >
              <input
                type="checkbox"
                checked={genreIds.includes(g.id)}
                onChange={(e) =>
                  setGenreIds(
                    e.target.checked
                      ? [...genreIds, g.id]
                      : genreIds.filter((x) => x !== g.id),
                  )
                }
              />{" "}
              {g.name}
            </label>
          ))}
        </fieldset>

        <button>{id ? "Save changes" : "Add book"}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
