import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Slot } from "../api";

export function BookingPage() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const bookingResult = searchParams.get("booking"); // "success" | "cancelled" | null

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    api
      .getAvailability(username)
      .then((res) => setSlots(res.slots))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  async function handleBook() {
    if (!selected || !username) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createBooking({
        hostUsername: username,
        startTime: selected.start,
        bookerName: name,
        bookerEmail: email,
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        if (err.message.includes("just booked")) {
          setSelected(null);
          api.getAvailability(username!).then((res) => setSlots(res.slots));
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (bookingResult === "success") {
    return (
      <div className="container">
        <div className="card">
          <h2>You're booked! 🎉</h2>
          <p>Check your email for confirmation. You can close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Book time with <span style={{ textTransform: "capitalize" }}>{username}</span></h1>
      {bookingResult === "cancelled" && (
        <p className="error">Payment was cancelled — your slot was not reserved.</p>
      )}
      {loading && <p>Loading available times...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !selected && (
        <div className="card">
          <h3>Pick a time</h3>
          <div className="slot-grid">
            {slots.map((slot) => (
              <button
                key={slot.start}
                className="slot-button"
                onClick={() => setSelected(slot)}
              >
                {new Date(slot.start).toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </button>
            ))}
            {slots.length === 0 && <p>No open slots in the next two weeks.</p>}
          </div>
        </div>
      )}

      {selected && (
        <div className="card">
          <h3>Confirm your details</h3>
          <p>
            <strong>
              {new Date(selected.start).toLocaleString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </strong>
          </p>
          <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            placeholder="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="primary" onClick={handleBook} disabled={submitting || !name || !email}>
            {submitting ? "Redirecting to payment..." : "Confirm & Pay $1.00"}
          </button>
          <button onClick={() => setSelected(null)}>Back</button>
        </div>
      )}
    </div>
  );
}