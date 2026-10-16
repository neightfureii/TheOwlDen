import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { errMsg } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const set =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [field]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await register(form);
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
      <h2>Join The Owl Den</h2>
      <input
        placeholder="Username"
        value={form.username}
        onChange={set("username")}
        required
      />
      <input
        placeholder="Display name (optional)"
        value={form.displayName}
        onChange={set("displayName")}
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={set("email")}
        required
      />
      <input
        type="password"
        placeholder="Password (min 8 chars)"
        minLength={8}
        value={form.password}
        onChange={set("password")}
        required
      />
      <button>Create account</button>
      {error && <p className="error">{error}</p>}
      <p className="muted">
        Already a member? <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
