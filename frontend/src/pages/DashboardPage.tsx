import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import BookRow from "../components/BookRow";
import {
  api,
  errMsg,
  STATUSES,
  STATUS_LABELS,
  type LibraryEntry,
  type ReadingStatus,
} from "../api";
import { useAuth } from "../auth/AuthContext";

interface Goal {
  year: number;
  targetBooks: number | null;
  booksRead: number;
}

const year = new Date().getFullYear();

export default function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<ReadingStatus, number> | null>(
    null,
  );
  const [reading, setReading] = useState<LibraryEntry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ counts: Record<ReadingStatus, number> }>("/library/summary"),
      api<{ entries: LibraryEntry[] }>("/library?status=reading"),
      api<Goal>(`/goals/${year}`),
    ])
      .then(([s, r, g]) => {
        setCounts(s.counts);
        setReading(r.entries);
        setGoal(g);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  async function saveGoal(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setGoal(
        await api<Goal>(`/goals/${year}`, {
          method: "PUT",
          body: JSON.stringify({ targetBooks: Number(target) }),
        }),
      );
      setTarget("");
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <>
      <h2>Welcome back, {user?.displayName}</h2>
      {error && <p className="error">{error}</p>}

      <div className="stat-row">
        {STATUSES.map((s) => (
          <Link key={s} to={`/library?status=${s}`} className="stat">
            <strong>{counts?.[s] ?? 0}</strong>
            <span>{STATUS_LABELS[s]}</span>
          </Link>
        ))}
      </div>

      <h3>{year} reading challenge</h3>
      {goal?.targetBooks ? (
        <p>
          <progress
            max={goal.targetBooks}
            value={Math.min(goal.booksRead, goal.targetBooks)}
          />{" "}
          {goal.booksRead} of {goal.targetBooks} books
        </p>
      ) : (
        <p className="muted">You haven't set a goal for {year} yet.</p>
      )}
      <form onSubmit={saveGoal} className="inline-form">
        <input
          type="number"
          min="1"
          max="1000"
          placeholder="Books this year"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
        <button>{goal?.targetBooks ? "Change goal" : "Set goal"}</button>
      </form>

      <h3>Currently reading</h3>
      {reading.length === 0 ? (
        <p className="muted">
          Nothing right now. <Link to="/books">Find your next book.</Link>
        </p>
      ) : (
        reading.map((e) => (
          <BookRow key={e.id} book={e.book}>
            <div className="muted">
              Page {e.currentPage}
              {e.book.pageCount ? ` of ${e.book.pageCount}` : ""}
            </div>
          </BookRow>
        ))
      )}
    </>
  );
}
