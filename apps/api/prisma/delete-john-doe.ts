import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const id = '69f6ce7225f9f29694bee54f';
  const before = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, clerkId: true },
  });
  if (!before) {
    console.log(`User ${id} already deleted.`);
  } else {
    await prisma.user.delete({ where: { id } });
    console.log(`Deleted user:`, before);
  }
  await prisma.$disconnect();
})();
