import { Link, useNavigate } from "react-router-dom";

export function Nav() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        <img src="/favicon.svg" alt="" width="20" height="20" style={{ verticalAlign: "middle", marginRight: 8 }} />
        SlotSync
      </Link>
      <div className="nav-links">
        {isLoggedIn ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button className="nav-button" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}