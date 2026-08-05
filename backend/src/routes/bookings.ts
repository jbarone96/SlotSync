import { Prisma } from "@prisma/client";
import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../db";
import { AppError } from "../middleware/errorHandler";

export const bookingsRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const createBookingSchema = z.object({
  hostUsername: z.string(),
  startTime: z.iso.datetime(),
  bookerName: z.string().min(1).max(100),
  bookerEmail: z.email(),
});

bookingsRouter.post("/", async (req, res, next) => {
  try {
    const { hostUsername, startTime, bookerName, bookerEmail } = createBookingSchema.parse(req.body);

    const host = await prisma.host.findUnique({ where: { username: hostUsername } });
    if (!host) throw new AppError("Host not found", 404);

    const start = new Date(startTime);
    const end = new Date(start.getTime() + host.slotDurationMins * 60_000);

    if (start.getTime() < Date.now()) {
      throw new AppError("Cannot book a time in the past", 400);
    }

    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          hostId: host.id,
          bookerName,
          bookerEmail,
          startTime: start,
          endTime: end,
          status: "PENDING",
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError("That slot was just booked by someone else. Please pick another.", 409);
      }
      throw err;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: bookerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 100,
            product_data: { name: `Meeting with ${host.username}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/book/${host.username}?booking=success`,
      cancel_url: `${process.env.FRONTEND_URL}/book/${host.username}?booking=cancelled`,
      metadata: { bookingId: booking.id },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    res.status(201).json({ bookingId: booking.id, checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
});