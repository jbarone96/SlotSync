import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to build a Date relative to "now" in days + a fixed hour/minute (ET-ish, naive).
function relativeDate(daysFromNow: number, hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  // Grab the first host in the DB. If you have multiple hosts and want a
  // specific one, swap this for: prisma.host.findUnique({ where: { username: 'yourusername' } })
  const host = await prisma.host.findFirst();

  if (!host) {
    throw new Error(
      'No Host found in the database. Create a host account first, then re-run this script.'
    );
  }

  console.log(`Seeding bookings for host: ${host.username} (${host.id})`);

  const slotMins = host.slotDurationMins ?? 30;

  const fakeBookings: Array<{
    bookerName: string;
    bookerEmail: string;
    startTime: Date;
    status: BookingStatus;
    stripeSessionId?: string;
    stripePaymentId?: string;
  }> = [
    {
      bookerName: 'Alicia Novak',
      bookerEmail: 'alicia.novak@example.com',
      startTime: relativeDate(-6, 10, 0), // past, confirmed
      status: BookingStatus.CONFIRMED,
      stripeSessionId: 'cs_test_seed_001',
      stripePaymentId: 'pi_test_seed_001',
    },
    {
      bookerName: 'Marcus Webb',
      bookerEmail: 'marcus.webb@example.com',
      startTime: relativeDate(-3, 14, 30), // past, confirmed
      status: BookingStatus.CONFIRMED,
      stripeSessionId: 'cs_test_seed_002',
      stripePaymentId: 'pi_test_seed_002',
    },
    {
      bookerName: 'Priya Chandran',
      bookerEmail: 'priya.chandran@example.com',
      startTime: relativeDate(1, 9, 0), // tomorrow, confirmed
      status: BookingStatus.CONFIRMED,
      stripeSessionId: 'cs_test_seed_003',
      stripePaymentId: 'pi_test_seed_003',
    },
    {
      bookerName: 'Devon Ashford',
      bookerEmail: 'devon.ashford@example.com',
      startTime: relativeDate(2, 11, 30), // in 2 days, confirmed
      status: BookingStatus.CONFIRMED,
      stripeSessionId: 'cs_test_seed_004',
      stripePaymentId: 'pi_test_seed_004',
    },
    {
      bookerName: 'Grace Liu',
      bookerEmail: 'grace.liu@example.com',
      startTime: relativeDate(4, 15, 0), // upcoming, still pending payment
      status: BookingStatus.PENDING,
      stripeSessionId: 'cs_test_seed_005',
    },
    {
      bookerName: 'Tom Reyes',
      bookerEmail: 'tom.reyes@example.com',
      startTime: relativeDate(5, 13, 0), // upcoming, confirmed
      status: BookingStatus.CONFIRMED,
      stripeSessionId: 'cs_test_seed_006',
      stripePaymentId: 'pi_test_seed_006',
    },
    {
      bookerName: 'Sam Okafor',
      bookerEmail: 'sam.okafor@example.com',
      startTime: relativeDate(-1, 16, 0), // recently cancelled
      status: BookingStatus.CANCELLED,
      stripeSessionId: 'cs_test_seed_007',
    },
  ];

  for (const b of fakeBookings) {
    const endTime = new Date(b.startTime.getTime() + slotMins * 60_000);

    await prisma.booking.upsert({
      where: {
        hostId_startTime: {
          hostId: host.id,
          startTime: b.startTime,
        },
      },
      update: {}, // if it already exists, leave it alone
      create: {
        hostId: host.id,
        bookerName: b.bookerName,
        bookerEmail: b.bookerEmail,
        startTime: b.startTime,
        endTime,
        status: b.status,
        stripeSessionId: b.stripeSessionId,
        stripePaymentId: b.stripePaymentId,
      },
    });

    console.log(
      `  ${b.status.padEnd(9)} ${b.bookerName.padEnd(16)} ${b.startTime.toLocaleString()}`
    );
  }

  console.log(`\nDone. Seeded ${fakeBookings.length} bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });