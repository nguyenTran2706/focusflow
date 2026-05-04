import { Global, Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service.js';

@Global()
@Module({
  providers: [AccessPolicyService],
  exports: [AccessPolicyService],
})
export class BillingModule {}
