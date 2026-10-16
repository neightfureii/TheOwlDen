import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { errMsg } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? "/";

  if (loading) return null;
  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(identifier, password);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <form
      onSubmit={submit}
      className="form-grid"
      style={{ margin: "4rem auto" }}
    >
      <h2>The Owl Den</h2>
      <input
        placeholder="Email or username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button>Sign in</button>
      {error && <p className="error">{error}</p>}
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>
  );
}
