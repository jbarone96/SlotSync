import { Router } from "express";
import { getAvailableSlots } from "../availability";
import { prisma } from "../db";
import { AppError } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/requireAuth";

export const hostsRouter = Router();

hostsRouter.get("/:username", async (req, res, next) => {
  try {
    const host = await prisma.host.findUnique({
      where: { username: req.params.username },
      select: { id: true, username: true, slotDurationMins: true, timezone: true },
    });
    if (!host) throw new AppError("Host not found", 404);
    res.json(host);
  } catch (err) {
    next(err);
  }
});

hostsRouter.get("/:username/availability", async (req, res, next) => {
  try {
    const host = await prisma.host.findUnique({ where: { username: req.params.username } });
    if (!host) throw new AppError("Host not found", 404);

    const slots = await getAvailableSlots(host.id);
    res.json({ slots });
  } catch (err) {
    next(err);
  }
});

hostsRouter.get("/me/bookings", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        hostId: req.hostId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

hostsRouter.post("/me/bookings/:id/cancel", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking || booking.hostId !== req.hostId) {
      throw new AppError("Booking not found", 404);
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});