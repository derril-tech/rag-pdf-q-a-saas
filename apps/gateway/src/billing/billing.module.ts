import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { PlanGatesService } from './plan-gates.service';
import { BillingController } from './billing.controller';

@Module({
    imports: [ConfigModule],
    controllers: [BillingController],
    providers: [StripeService, PlanGatesService],
    exports: [StripeService, PlanGatesService],
})
export class BillingModule { }
