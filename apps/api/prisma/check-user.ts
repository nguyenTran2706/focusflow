import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findRaw({
    filter: {
      $or: [
        { email: 'trankhoinguyen2706@gmail.com' },
        { email: { $regex: 'trankhoinguyen', $options: 'i' } },
        { name: { $regex: 'Nguyen', $options: 'i' } },
      ],
    },
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
})();
