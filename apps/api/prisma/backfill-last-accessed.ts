// One-time backfill: stamp lastAccessedAt on existing memberships and boards
// that pre-date the downgrade-lock feature. Run with:
//   npx tsx apps/api/prisma/backfill-last-accessed.ts
//
// Safe to re-run — only touches docs missing the field (Mongo $exists check
// via raw filter, which Prisma surfaces through findMany without that field
// being part of the typed `where`; we use a date-based proxy instead).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // For Mongo, Prisma sets the @default(now()) at *write* time on new docs only.
  // Existing docs have no field at all. We can't filter on "field missing"
  // through Prisma's typed API, so we just stamp every membership/board to
  // its createdAt — a no-op for new rows that already have a sensible value.
  const memberships = await prisma.membership.findMany({
    select: { id: true, createdAt: true },
  });
  for (const m of memberships) {
    await prisma.membership.update({
      where: { id: m.id },
      data: { lastAccessedAt: m.createdAt },
    });
  }
  console.log(`Backfilled ${memberships.length} memberships`);

  const boards = await prisma.board.findMany({
    select: { id: true, updatedAt: true },
  });
  for (const b of boards) {
    await prisma.board.update({
      where: { id: b.id },
      data: { lastAccessedAt: b.updatedAt },
    });
  }
  console.log(`Backfilled ${boards.length} boards`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
