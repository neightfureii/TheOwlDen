import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, errMsg, type Shelf } from "../api";

export default function ShelvesPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ shelves: Shelf[] }>("/shelves")
      .then((d) => setShelves(d.shelves))
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(load, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/shelves", {
        method: "POST",
        body: JSON.stringify({ name, isPublic }),
      });
      setName("");
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <>
      <h2>My shelves</h2>
      <form onSubmit={create} className="inline-form">
        <input
          placeholder="New shelf name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />{" "}
          Public
        </label>
        <button>Create shelf</button>
      </form>
      {error && <p className="error">{error}</p>}

      {shelves.length === 0 ? (
        <p className="muted">
          No shelves yet. Create one, then add books from a book's page.
        </p>
      ) : (
        <ul>
          {shelves.map((s) => (
            <li key={s.id}>
              <Link to={`/shelves/${s.id}`}>{s.name}</Link>{" "}
              <span className="muted">
                {s._count.entries} book{s._count.entries === 1 ? "" : "s"} ·{" "}
                {s.isPublic ? "public" : "private"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
