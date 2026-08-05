import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const usernameValid = /^[a-z0-9-]{3,30}$/.test(username);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const formValid = usernameValid && emailValid && passwordValid;

  async function handleSignup() {
    setTouched(true);
    if (!formValid) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await api.signup(username, email, password);
      localStorage.setItem("token", res.token);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Create your booking page</h2>
        {error && <p className="error">{error}</p>}

        <div className="field">
          <input
            placeholder="Username (becomes your link: /book/username)"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
          {touched && !usernameValid && (
            <div className="tooltip">3–30 characters: lowercase letters, numbers, hyphens only.</div>
          )}
        </div>

        <div className="field">
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {touched && !emailValid && <div className="tooltip">Enter a valid email address.</div>}
        </div>

        <div className="field">
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {touched && !passwordValid && (
            <div className="tooltip">Password needs at least 8 characters.</div>
          )}
        </div>

        <button className="primary" onClick={handleSignup} disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </button>

        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Default availability: Mon–Fri, 9am–5pm, 30-minute slots. You can change this later.
        </p>
      </div>
    </div>
  );
}