import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="app-header">
        <strong>The Owl Den</strong>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/library">My books</NavLink>
          <NavLink to="/books">Browse</NavLink>
          <NavLink to="/shelves">Shelves</NavLink>
          <NavLink to={`/u/${user?.username}`}>Profile</NavLink>
          {user?.role === "admin" && <NavLink to="/admin/users">Users</NavLink>}
        </nav>
        <span className="muted">{user?.displayName}</span>
        <button onClick={logout}>Log out</button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
