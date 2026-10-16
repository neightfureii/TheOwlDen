import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import BookRow from '../components/BookRow';
import Stars from '../components/Stars';
import { api, errMsg, STATUSES, STATUS_LABELS, type Book, type ReadingStatus, type User } from '../api';
import { useAuth } from '../auth/AuthContext';

interface ProfileData {
  profile: {
    id: number;
    username: string;
    displayName: string;
    bio: string | null;
    createdAt: string;
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
    isSelf: boolean;
  };
  counts: Record<ReadingStatus, number>;
  recentReads: { rating: number | null; book: Book }[];
  shelves: { id: number; name: string; _count: { entries: number } }[];
}

export default function ProfilePage() {
  const { username = '' } = useParams();
  const { updateUser } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  const load = useCallback(async () => {
    const d = await api<ProfileData>(`/profiles/${encodeURIComponent(username)}`);
    setData(d);
    setDisplayName(d.profile.displayName);
    setBio(d.profile.bio ?? '');
  }, [username]);

  useEffect(() => {
    load().catch((e) => setError(errMsg(e)));
  }, [load]);

  async function toggleFollow() {
    if (!data) return;
    setError('');
    try {
      await api(`/profiles/${encodeURIComponent(username)}/follow`, {
        method: data.profile.isFollowing ? 'DELETE' : 'PUT',
      });
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { user } = await api<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio }),
      });
      updateUser(user);
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { profile, counts, recentReads, shelves } = data;

  return (
    <>
      <h2 style={{ marginBottom: 0 }}>{profile.displayName}</h2>
      <p className="muted">
        @{profile.username} · {profile.followerCount} followers · {profile.followingCount} following
      </p>
      {profile.bio && <p style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
      {error && <p className="error">{error}</p>}

      {!profile.isSelf && (
        <button onClick={toggleFollow}>{profile.isFollowing ? 'Unfollow' : 'Follow'}</button>
      )}

      <div className="stat-row">
        {STATUSES.map((s) => (
          <div key={s} className="stat">
            <strong>{counts[s]}</strong>
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {profile.isSelf && (
        <form onSubmit={saveProfile} className="form-grid">
          <h3>Edit profile</h3>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <textarea rows={3} placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <button>Save</button>
        </form>
      )}

      <h3>Recently read</h3>
      {recentReads.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        recentReads.map((r) => (
          <BookRow key={r.book.id} book={r.book}>
            {r.rating && <Stars value={r.rating} />}
          </BookRow>
        ))
      )}

      <h3>Shelves</h3>
      {shelves.length === 0 ? (
        <p className="muted">No public shelves.</p>
      ) : (
        <ul>
          {shelves.map((s) => (
            <li key={s.id}>
              <Link to={`/shelves/${s.id}`}>{s.name}</Link>{' '}
              <span className="muted">({s._count.entries})</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}