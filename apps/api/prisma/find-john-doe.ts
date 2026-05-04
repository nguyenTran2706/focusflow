import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const matches = await prisma.user.findMany({
    where: { name: { contains: 'John Doe', mode: 'insensitive' } },
    select: {
      id: true,
      clerkId: true,
      email: true,
      name: true,
      role: true,
      subscription: true,
      createdAt: true,
    },
  });
  console.log(JSON.stringify(matches, null, 2));
  await prisma.$disconnect();
})();
