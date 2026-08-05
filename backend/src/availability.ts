import { addDays, addMinutes, isBefore, parse, startOfDay } from "date-fns";
import { prisma } from "./db";

type WeeklyAvailability = Record<string, [string, string][]>;
// e.g. { "mon": [["09:00","12:00"], ["13:00","17:00"]], "tue": [...] }

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Pure function, deliberately separated from the DB-querying function below
 * so it's trivially unit-testable without a database. Given one day's
 * working window and a slot duration, returns every candidate slot start
 * time within that window. No knowledge of bookings or "now" — those
 * concerns are layered on by the caller.
 */
export function generateSlotsForWindow(day: Date, windowStart: string, windowEnd: string, durationMins: number) {
  const slots: Date[] = [];
  let cursor = parse(windowStart, "HH:mm", day);
  const end = parse(windowEnd, "HH:mm", day);

  while (isBefore(cursor, end) || +addMinutes(cursor, 0) === +end) {
    const slotEnd = addMinutes(cursor, durationMins);
    if (isBefore(slotEnd, end) || +slotEnd === +end) {
      slots.push(cursor);
    } else {
      break;
    }
    cursor = slotEnd;
  }
  return slots;
}

/**
 * Computes bookable slots for a host over the next `daysAhead` days.
 *
 * Design note: this is intentionally computed on-demand rather than
 * pre-materialized into a "slots" table. For an MVP the read volume is low
 * enough that on-the-fly computation is simpler and avoids a stale-data
 * problem (materialized slots would need invalidation whenever a host edits
 * their availability). If this needed to scale to thousands of hosts with
 * heavy read traffic, the next step would be to cache computed slots per
 * host per day in Redis with a short TTL, invalidated on availability edits.
 */
export async function getAvailableSlots(hostId: string, daysAhead = 14) {
  const host = await prisma.host.findUnique({ where: { id: hostId } });
  if (!host) throw new Error("Host not found");

  const availability = host.availability as unknown as WeeklyAvailability;
  const duration = host.slotDurationMins;

  const rangeStart = startOfDay(new Date());
  const rangeEnd = addDays(rangeStart, daysAhead);

  // Pull existing bookings once, up front, instead of querying per-slot.
  const existingBookings = await prisma.booking.findMany({
    where: {
      hostId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: rangeStart, lt: rangeEnd },
    },
    select: { startTime: true },
  });
  const bookedTimes = new Set(existingBookings.map((b) => b.startTime.toISOString()));

  const slots: { start: string; end: string }[] = [];

  for (let day = rangeStart; isBefore(day, rangeEnd); day = addDays(day, 1)) {
    const dayKey = DAY_KEYS[day.getDay()];
    const windows = availability[dayKey] ?? [];

    for (const [windowStart, windowEnd] of windows) {
      const candidateStarts = generateSlotsForWindow(day, windowStart, windowEnd, duration);

      for (const slotStart of candidateStarts) {
        const slotEnd = addMinutes(slotStart, duration);

        // Skip slots in the past and slots that are already booked
        if (isBefore(new Date(), slotStart) && !bookedTimes.has(slotStart.toISOString())) {
          slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
        }
      }
    }
  }

  return slots;
}