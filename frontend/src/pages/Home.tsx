import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>SlotSync</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Simple scheduling, without the double-booked slots.
        </p>
        <Link to="/book/jordan">
          <button className="primary">Try the demo booking page</button>
        </Link>
      </div>

      <div className="card">
        <h3>For hosts</h3>
        <p style={{ color: "#666", fontSize: 14 }}>
          Set your availability once, share your link, get booked — with payment
          confirmation built in.
        </p>
        <Link to="/signup">
          <button className="primary">Create your booking page</button>
        </Link>
      </div>
    </div>
  );
}