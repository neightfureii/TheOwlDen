import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Page not found</h2>
      <Link to="/">Back to dashboard</Link>
    </div>
  );
}