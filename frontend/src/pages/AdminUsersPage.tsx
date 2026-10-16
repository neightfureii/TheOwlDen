import { useEffect, useState } from "react";
import { api, errMsg, type Role } from "../api";
import { useAuth } from "../auth/AuthContext";

interface AdminUser {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ users: AdminUser[] }>("/users")
      .then((d) => setUsers(d.users))
      .catch((e) => setError(errMsg(e)));
  }, []);

  async function patch(
    id: number,
    body: Partial<Pick<AdminUser, "role" | "isActive">>,
  ) {
    setError("");
    try {
      await api(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setUsers((list) =>
        list.map((u) => (u.id === id ? { ...u, ...body } : u)),
      );
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <>
      <h2>Users</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                {u.displayName} <span className="muted">@{u.username}</span>
              </td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  disabled={u.id === me?.id}
                  onChange={(e) =>
                    void patch(u.id, { role: e.target.value as Role })
                  }
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={u.isActive}
                  disabled={u.id === me?.id}
                  onChange={(e) =>
                    void patch(u.id, { isActive: e.target.checked })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
