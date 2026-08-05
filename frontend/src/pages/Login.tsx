import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function Login() {
  const [email, setEmail] = useState("jordan@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleLogin() {
    setError(null);
    try {
      const res = await api.login(email, password);
      localStorage.setItem("token", res.token);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Host login</h2>
        {error && <p className="error">{error}</p>}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button className="primary" onClick={handleLogin}>
          Log in
        </button>
        <p style={{ fontSize: 13, color: "#888" }}>
          Demo host: jordan@example.com / demo1234 (after running the seed script)
        </p>
      </div>
    </div>
  );
}