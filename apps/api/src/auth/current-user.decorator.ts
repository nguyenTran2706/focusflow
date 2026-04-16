import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Extracts the authenticated user from the request (set by JwtStrategy).
 *  Usage: `@CurrentUser() user: { userId: string; email: string }` */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as { userId: string; email: string };
  },
);
