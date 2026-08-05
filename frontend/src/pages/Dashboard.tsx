import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Booking } from "../api";

export function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api
      .getMyBookings()
      .then((res) => setBookings(res.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    load();
  }, [load, navigate]);

  async function handleCancel(id: string) {
    try {
      setLoading(true);
      await api.cancelBooking(id);
      load();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      setLoading(false);
    }
  }

  const stampClass = {
    CONFIRMED: "stamp stamp-confirmed",
    PENDING: "stamp stamp-pending",
    CANCELLED: "stamp stamp-cancelled",
  };

  return (
    <div className="container">
      <h1>Upcoming bookings</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && bookings.length === 0 && <p>No upcoming bookings yet.</p>}

      {bookings.map((b) => (
        <div key={b.id} className="ticket">
          <div className="ticket-stub">SlotSync</div>
          <div className="ticket-perforation" />
          <div className="ticket-body">
            <span className={stampClass[b.status]} style={{ float: "right" }}>
              {b.status}
            </span>
            <div className="ticket-time">
              {new Date(b.startTime).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <div className="ticket-meta">
              <span style={{ textTransform: "capitalize" }}>{b.bookerName}</span> · {b.bookerEmail}
            </div>
            {b.status !== "CANCELLED" && (
              <button className="danger" onClick={() => handleCancel(b.id)} style={{ marginTop: 16 }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}