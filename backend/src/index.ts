import cors from "cors";
import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { bookingsRouter } from "./routes/bookings";
import { hostsRouter } from "./routes/hosts";
import { stripeWebhookRouter } from "./routes/stripeWebhook";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));

// IMPORTANT: the Stripe webhook route must receive the raw body (not JSON
// parsed) so its signature can be verified. It's mounted BEFORE
// express.json() runs for that path.
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/hosts", hostsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/stripe/webhook", stripeWebhookRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

const port = process.env.PORT ?? 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));