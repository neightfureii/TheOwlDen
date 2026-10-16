import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BookRow from "../components/BookRow";
import Stars from "../components/Stars";
import {
  api,
  errMsg,
  STATUSES,
  STATUS_LABELS,
  type LibraryEntry,
} from "../api";

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<{ entries: LibraryEntry[] }>(
      `/library${status ? `?status=${status}` : ""}`,
    )
      .then((d) => !cancelled && setEntries(d.entries))
      .catch((e) => !cancelled && setError(errMsg(e)));
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <>
      <h2>My books</h2>
      <div className="tabs">
        <button
          className={status === "" ? "tab on" : "tab"}
          onClick={() => setParams({})}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={status === s ? "tab on" : "tab"}
            onClick={() => setParams({ status: s })}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {entries === null ? (
        <p>Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        entries.map((e) => (
          <BookRow key={e.id} book={e.book}>
            <div className="muted">{STATUS_LABELS[e.status]}</div>
            {e.rating && <Stars value={e.rating} />}
            {e.status === "reading" && (
              <div className="muted">
                Page {e.currentPage}
                {e.book.pageCount ? ` of ${e.book.pageCount}` : ""}
              </div>
            )}
          </BookRow>
        ))
      )}
    </>
  );
}
