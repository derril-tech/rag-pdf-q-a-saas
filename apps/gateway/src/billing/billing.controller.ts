import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Req,
    Res,
    HttpStatus,
    HttpException,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { StripeService, BillingPlan, UsageMetrics } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

// DTOs
export class CreateSubscriptionDto {
    planId: string;
    trialDays?: number;
}

export class UpdateSubscriptionDto {
    planId: string;
}

export class CreateCheckoutSessionDto {
    planId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
}

export class CreatePortalSessionDto {
    returnUrl: string;
}

export class UsageMetricsDto {
    documentsCount: number;
    tokensUsed: number;
    usersCount: number;
    apiCalls: number;
}

@ApiTags('billing')
@Controller('v1/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BillingController {
    constructor(private readonly stripeService: StripeService) { }

    @Get('plans')
    @ApiOperation({ summary: 'Get all available billing plans' })
    @ApiResponse({ status: 200, description: 'List of billing plans' })
    async getPlans(): Promise<BillingPlan[]> {
        return this.stripeService.getPlans();
    }

    @Get('plans/:planId')
    @ApiOperation({ summary: 'Get a specific billing plan' })
    @ApiResponse({ status: 200, description: 'Billing plan details' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    async getPlan(@Param('planId') planId: string): Promise<BillingPlan> {
        const plan = this.stripeService.getPlan(planId);
        if (!plan) {
            throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
        }
        return plan;
    }

    @Post('customers')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a Stripe customer for organization' })
    @ApiResponse({ status: 201, description: 'Customer created successfully' })
    async createCustomer(
        @Req() req: Request,
        @Body() body: { email: string; name?: string }
    ) {
        const organizationId = req.user['organizationId'];
        const customer = await this.stripeService.createCustomer(
            organizationId,
            body.email,
            body.name
        );
        return customer;
    }

    @Post('subscriptions')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a subscription for organization' })
    @ApiResponse({ status: 201, description: 'Subscription created successfully' })
    async createSubscription(
        @Req() req: Request,
        @Body() body: CreateSubscriptionDto
    ) {
        const organizationId = req.user['organizationId'];
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const subscription = await this.stripeService.createSubscription(
            customerId,
            body.planId,
            organizationId,
            body.trialDays
        );
        return subscription;
    }

    @Put('subscriptions/:subscriptionId')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update subscription plan' })
    @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
    async updateSubscription(
        @Param('subscriptionId') subscriptionId: string,
        @Body() body: UpdateSubscriptionDto,
        @Req() req: Request
    ) {
        const organizationId = req.user['organizationId'];
        const subscription = await this.stripeService.updateSubscription(
            subscriptionId,
            body.planId,
            organizationId
        );
        return subscription;
    }

    @Delete('subscriptions/:subscriptionId')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Cancel subscription' })
    @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
    async cancelSubscription(
        @Param('subscriptionId') subscriptionId: string,
        @Query('atPeriodEnd') atPeriodEnd: string = 'true',
        @Req() req: Request
    ) {
        const organizationId = req.user['organizationId'];
        const subscription = await this.stripeService.cancelSubscription(
            subscriptionId,
            organizationId,
            atPeriodEnd === 'true'
        );
        return subscription;
    }

    @Post('subscriptions/:subscriptionId/reactivate')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Reactivate a cancelled subscription' })
    @ApiResponse({ status: 200, description: 'Subscription reactivated successfully' })
    async reactivateSubscription(@Param('subscriptionId') subscriptionId: string) {
        const subscription = await this.stripeService.reactivateSubscription(subscriptionId);
        return subscription;
    }

    @Get('subscriptions/:subscriptionId')
    @ApiOperation({ summary: 'Get subscription details' })
    @ApiResponse({ status: 200, description: 'Subscription details' })
    async getSubscription(@Param('subscriptionId') subscriptionId: string) {
        const subscription = await this.stripeService.getSubscription(subscriptionId);
        return subscription;
    }

    @Post('checkout-sessions')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a checkout session for subscription' })
    @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
    async createCheckoutSession(
        @Req() req: Request,
        @Body() body: CreateCheckoutSessionDto
    ) {
        const organizationId = req.user['organizationId'];
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const session = await this.stripeService.createCheckoutSession(
            customerId,
            body.planId,
            organizationId,
            body.successUrl,
            body.cancelUrl,
            body.trialDays
        );
        return session;
    }

    @Post('portal-sessions')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a portal session for customer self-service' })
    @ApiResponse({ status: 201, description: 'Portal session created successfully' })
    async createPortalSession(
        @Req() req: Request,
        @Body() body: CreatePortalSessionDto
    ) {
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const session = await this.stripeService.createPortalSession(
            customerId,
            body.returnUrl
        );
        return session;
    }

    @Post('usage-records/:subscriptionItemId')
    @ApiOperation({ summary: 'Create usage record for metered billing' })
    @ApiResponse({ status: 201, description: 'Usage record created successfully' })
    async createUsageRecord(
        @Param('subscriptionItemId') subscriptionItemId: string,
        @Body() body: { quantity: number; timestamp?: number }
    ) {
        const usageRecord = await this.stripeService.createUsageRecord(
            subscriptionItemId,
            body.quantity,
            body.timestamp
        );
        return usageRecord;
    }

    @Get('usage-records/:subscriptionItemId')
    @ApiOperation({ summary: 'Get usage records for a subscription item' })
    @ApiResponse({ status: 200, description: 'Usage records' })
    async getUsageRecords(
        @Param('subscriptionItemId') subscriptionItemId: string,
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string
    ) {
        const usageRecords = await this.stripeService.getUsageRecords(
            subscriptionItemId,
            startTime ? parseInt(startTime) : undefined,
            endTime ? parseInt(endTime) : undefined
        );
        return usageRecords;
    }

    @Post('check-limits')
    @ApiOperation({ summary: 'Check if organization has exceeded plan limits' })
    @ApiResponse({ status: 200, description: 'Plan limits check result' })
    async checkPlanLimits(
        @Req() req: Request,
        @Body() body: UsageMetricsDto
    ) {
        const planId = req.user['planId'] || 'free';
        const result = this.stripeService.checkPlanLimits(planId, body);
        return result;
    }

    @Post('calculate-overage')
    @ApiOperation({ summary: 'Calculate overage charges' })
    @ApiResponse({ status: 200, description: 'Overage charges calculation' })
    async calculateOverageCharges(
        @Req() req: Request,
        @Body() body: UsageMetricsDto
    ) {
        const planId = req.user['planId'] || 'free';
        const result = this.stripeService.calculateOverageCharges(planId, body);
        return result;
    }

    @Post('webhooks')
    @ApiOperation({ summary: 'Handle Stripe webhook events' })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    async handleWebhook(@Req() req: Request, @Res() res: Response) {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig || !endpointSecret) {
            throw new HttpException('Missing webhook signature or secret', HttpStatus.BAD_REQUEST);
        }

        try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

            await this.stripeService.handleWebhookEvent(event);

            res.status(200).json({ received: true });
        } catch (err) {
            throw new HttpException(`Webhook Error: ${err.message}`, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('invoices')
    @ApiOperation({ summary: 'Get organization invoices' })
    @ApiResponse({ status: 200, description: 'List of invoices' })
    async getInvoices(@Req() req: Request) {
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 100,
        });

        return invoices;
    }

    @Get('payment-methods')
    @ApiOperation({ summary: 'Get organization payment methods' })
    @ApiResponse({ status: 200, description: 'List of payment methods' })
    async getPaymentMethods(@Req() req: Request) {
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        return paymentMethods;
    }

    @Post('payment-methods/:paymentMethodId/attach')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Attach a payment method to customer' })
    @ApiResponse({ status: 200, description: 'Payment method attached successfully' })
    async attachPaymentMethod(
        @Param('paymentMethodId') paymentMethodId: string,
        @Req() req: Request
    ) {
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        return paymentMethod;
    }

    @Delete('payment-methods/:paymentMethodId')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Detach a payment method from customer' })
    @ApiResponse({ status: 200, description: 'Payment method detached successfully' })
    async detachPaymentMethod(@Param('paymentMethodId') paymentMethodId: string) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
        return paymentMethod;
    }

    @Post('payment-intents')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Create a payment intent for one-time charges' })
    @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
    async createPaymentIntent(
        @Req() req: Request,
        @Body() body: { amount: number; currency: string; metadata?: Record<string, string> }
    ) {
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const paymentIntent = await this.stripeService.createPaymentIntent(
            body.amount,
            body.currency,
            customerId,
            body.metadata
        );
        return paymentIntent;
    }

    @Get('billing-history')
    @ApiOperation({ summary: 'Get organization billing history' })
    @ApiResponse({ status: 200, description: 'Billing history' })
    async getBillingHistory(@Req() req: Request) {
        const customerId = req.user['stripeCustomerId'];

        if (!customerId) {
            throw new HttpException('No Stripe customer found', HttpStatus.BAD_REQUEST);
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

        // Get invoices
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 50,
        });

        // Get charges
        const charges = await stripe.charges.list({
            customer: customerId,
            limit: 50,
        });

        // Get subscriptions
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 10,
        });

        return {
            invoices: invoices.data,
            charges: charges.data,
            subscriptions: subscriptions.data,
        };
    }

    @Get('current-usage')
    @ApiOperation({ summary: 'Get current usage metrics for organization' })
    @ApiResponse({ status: 200, description: 'Current usage metrics' })
    async getCurrentUsage(@Req() req: Request) {
        const organizationId = req.user['organizationId'];

        // This would typically fetch from your database
        // For now, returning mock data
        const usage: UsageMetrics = {
            documentsCount: 25,
            tokensUsed: 50000,
            usersCount: 3,
            apiCalls: 150,
        };

        const planId = req.user['planId'] || 'free';
        const plan = this.stripeService.getPlan(planId);
        const limits = this.stripeService.checkPlanLimits(planId, usage);

        return {
            usage,
            plan,
            limits,
            overage: this.stripeService.calculateOverageCharges(planId, usage),
        };
    }
}
