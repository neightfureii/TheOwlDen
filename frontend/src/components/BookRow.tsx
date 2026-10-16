import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../api';

export default function BookRow({ book, children }: { book: Book; children?: ReactNode }) {
  return (
    <div className="book-row">
      {book.coverUrl ? (
        <img src={book.coverUrl} alt="" className="cover" />
      ) : (
        <div className="cover placeholder">No cover</div>
      )}
      <div>
        <Link to={`/books/${book.id}`}>
          <strong>{book.title}</strong>
        </Link>
        <div className="muted">{book.authors.map((a) => a.name).join(', ')}</div>
        {book.avgRating != null && (
          <div className="muted">
            ★ {book.avgRating.toFixed(1)} ({book.ratingCount})
          </div>
        )}
        {children}
      </div>
    </div>
  );
}