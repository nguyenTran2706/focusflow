import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async syncUser(data: { clerkId: string; email: string; name: string; imageUrl?: string }) {
    try {
      return await this.prisma.user.upsert({
        where: { clerkId: data.clerkId },
        update: {
          email: data.email,
          name: data.name,
          imageUrl: data.imageUrl ?? undefined,
        },
        create: {
          clerkId: data.clerkId,
          email: data.email,
          name: data.name,
          imageUrl: data.imageUrl,
        },
      });
    } catch (err: unknown) {
      // If a user with this email already exists (from old JWT auth),
      // link the existing account to the new Clerk identity.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        return this.prisma.user.update({
          where: { email: data.email },
          data: {
            clerkId: data.clerkId,
            name: data.name,
            imageUrl: data.imageUrl ?? undefined,
          },
        });
      }
      throw err;
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        imageUrl: true,
        phone: true,
        addressStreet: true,
        addressCity: true,
        addressState: true,
        addressPostal: true,
        addressCountry: true,
        role: true,
        subscription: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: {
    name?: string;
    phone?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPostal?: string;
    addressCountry?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        addressStreet: true,
        addressCity: true,
        addressState: true,
        addressPostal: true,
        addressCountry: true,
        role: true,
        subscription: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(clerkId: string) {
    return this.prisma.user.delete({ where: { clerkId } }).catch(() => null);
  }
}
