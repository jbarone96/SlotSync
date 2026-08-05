const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export interface Slot {
  start: string;
  end: string;
}

export interface Booking {
  id: string;
  bookerName: string;
  bookerEmail: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  getHost: (username: string) => request<{ username: string; slotDurationMins: number }>(`/hosts/${username}`),

  getAvailability: (username: string) => request<{ slots: Slot[] }>(`/hosts/${username}/availability`),

  createBooking: (payload: { hostUsername: string; startTime: string; bookerName: string; bookerEmail: string }) =>
    request<{ bookingId: string; checkoutUrl: string }>("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; host: { id: string; username: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

    signup: (username: string, email: string, password: string) =>
    request<{ token: string; host: { id: string; username: string } }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
  }),

  getMyBookings: () => request<{ bookings: Booking[] }>("/hosts/me/bookings"),

  cancelBooking: (id: string) => request<{ ok: true }>(`/hosts/me/bookings/${id}/cancel`, { method: "POST" }),
};