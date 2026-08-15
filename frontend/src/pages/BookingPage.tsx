import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { Slot } from "../api";

function dateKey(iso: string): string {
  // Local-time YYYY-MM-DD, so slots group under the day the user sees, not UTC.
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getMonthGrid(viewDate: Date): (Date | null)[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function isPastDay(date: Date): boolean {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

export function BookingPage() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const bookingResult = searchParams.get("booking"); // "success" | "cancelled" | null

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
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

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = dateKey(slot.start);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [slots]);

  const cells = useMemo(() => getMonthGrid(viewDate), [viewDate]);
  const timesForSelectedDate = selectedDateKey ? slotsByDate.get(selectedDateKey) ?? [] : [];
  const todayKey = dateKey(new Date().toISOString());

  function handlePickDay(date: Date | null) {
    if (!date || isPastDay(date)) return;
    const key = dateKey(date.toISOString());
    if (!slotsByDate.has(key)) return;
    setSelectedDateKey(key);
    setSelected(null);
  }

  function changeMonth(delta: number) {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  }

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
          setSelectedDateKey(null);
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
    <div className="container container-wide">
      <h1>
        Book time with <span style={{ textTransform: "capitalize" }}>{username}</span>
      </h1>
      {bookingResult === "cancelled" && (
        <p className="error">Payment was cancelled — your slot was not reserved.</p>
      )}
      {loading && <p>Loading available times...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !selected && (
        <div className="card booking-card">
          <div className="calendar-panel">
            <div className="calendar-header">
              <span className="calendar-month-label">{formatMonthLabel(viewDate)}</span>
              <div className="calendar-nav">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  aria-label="Previous month"
                  onClick={() => changeMonth(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {weekdayLabels.map((w, i) => (
                <div key={i} className="calendar-weekday">
                  {w}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const key = dateKey(date.toISOString());
                const hasSlots = slotsByDate.has(key);
                const disabled = isPastDay(date) || !hasSlots;
                const isSelected = selectedDateKey === key;
                const isToday = key === todayKey;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => handlePickDay(date)}
                    className={
                      "calendar-day" +
                      (isSelected ? " calendar-day-selected" : "") +
                      (disabled ? " calendar-day-disabled" : "") +
                      (isToday && !isSelected ? " calendar-day-today" : "")
                    }
                  >
                    {date.getDate()}
                    {hasSlots && !disabled && <span className="calendar-day-dot" />}
                  </button>
                );
              })}
            </div>

            <div className="calendar-legend">
              <span className="calendar-day-dot" /> Available
            </div>
          </div>

          <div className="calendar-divider" />

          <div className="times-panel">
            {!selectedDateKey && (
              <div className="times-empty">Select a date to see available times</div>
            )}

            {selectedDateKey && (
              <>
                <div className="times-heading">
                  {timesForSelectedDate.length} time
                  {timesForSelectedDate.length !== 1 ? "s" : ""} available
                </div>
                <div className="times-list">
                  {timesForSelectedDate.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      className="times-slot"
                      onClick={() => setSelected(slot)}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              </>
            )}

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