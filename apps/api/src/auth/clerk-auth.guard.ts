import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/express';
import { PrismaService } from '../prisma/prisma.service.js';
import { Request } from 'express';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const token = authHeader.slice(7);
    try {
      const secretKey = process.env['CLERK_SECRET_KEY'] ?? '';
      const verified = await verifyToken(token, { secretKey });
      const clerkId = verified.sub;

      // Check if this is the /auth/sync endpoint — first-time users won't
      // exist in the DB yet, so we allow the request through with just the
      // clerkId so the sync handler can upsert the record.
      const isSyncEndpoint = request.url?.includes('/auth/sync') ?? false;

      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        select: { id: true, email: true, clerkId: true, role: true },
      });

      if (!user && !isSyncEndpoint) {
        throw new UnauthorizedException('User not found — complete sign-up first');
      }

      (request as unknown as Record<string, unknown>).user = user
        ? { userId: user.id, email: user.email, clerkId: user.clerkId, role: user.role }
        : { userId: null, email: null, clerkId, role: null };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
