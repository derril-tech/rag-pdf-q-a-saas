import Stripe from 'stripe';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BillingPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: {
        maxDocuments: number;
        maxTokensPerMonth: number;
        maxUsers: number;
        slackIntegration: boolean;
        apiAccess: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
    };
    stripePriceId: string;
}

export interface UsageMetrics {
    documentsCount: number;
    tokensUsed: number;
    usersCount: number;
    apiCalls: number;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private stripe: Stripe;

    // Predefined billing plans
    private readonly plans: BillingPlan[] = [
        {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'usd',
            interval: 'month',
            features: {
                maxDocuments: 5,
                maxTokensPerMonth: 10000,
                maxUsers: 1,
                slackIntegration: false,
                apiAccess: false,
                prioritySupport: false,
                customBranding: false,
            },
            stripePriceId: '',
        },
        {
            id: 'starter',
            name: 'Starter',
            price: 29,
            currency: 'usd',
            interval: 'month',
            features: {
                maxDocuments: 50,
                maxTokensPerMonth: 100000,
                maxUsers: 5,
                slackIntegration: true,
                apiAccess: true,
                prioritySupport: false,
                customBranding: false,
            },
            stripePriceId: 'price_starter_monthly',
        },
        {
            id: 'professional',
            name: 'Professional',
            price: 99,
            currency: 'usd',
            interval: 'month',
            features: {
                maxDocuments: 500,
                maxTokensPerMonth: 1000000,
                maxUsers: 25,
                slackIntegration: true,
                apiAccess: true,
                prioritySupport: true,
                customBranding: false,
            },
            stripePriceId: 'price_professional_monthly',
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 299,
            currency: 'usd',
            interval: 'month',
            features: {
                maxDocuments: -1, // Unlimited
                maxTokensPerMonth: -1, // Unlimited
                maxUsers: -1, // Unlimited
                slackIntegration: true,
                apiAccess: true,
                prioritySupport: true,
                customBranding: true,
            },
            stripePriceId: 'price_enterprise_monthly',
        },
    ];

    constructor(private configService: ConfigService) {
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is required');
        }

        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16',
        });
    }

    /**
     * Get all available billing plans
     */
    getPlans(): BillingPlan[] {
        return this.plans;
    }

    /**
     * Get a specific plan by ID
     */
    getPlan(planId: string): BillingPlan | undefined {
        return this.plans.find(plan => plan.id === planId);
    }

    /**
     * Create a customer in Stripe
     */
    async createCustomer(organizationId: string, email: string, name?: string): Promise<Stripe.Customer> {
        try {
            const customer = await this.stripe.customers.create({
                email,
                name,
                metadata: {
                    organizationId,
                },
            });

            this.logger.log(`Created Stripe customer ${customer.id} for organization ${organizationId}`);
            return customer;
        } catch (error) {
            this.logger.error(`Failed to create Stripe customer: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a subscription for an organization
     */
    async createSubscription(
        customerId: string,
        planId: string,
        organizationId: string,
        trialDays?: number
    ): Promise<Stripe.Subscription> {
        try {
            const plan = this.getPlan(planId);
            if (!plan) {
                throw new Error(`Plan ${planId} not found`);
            }

            if (plan.id === 'free') {
                throw new Error('Cannot create subscription for free plan');
            }

            const subscriptionData: Stripe.SubscriptionCreateParams = {
                customer: customerId,
                items: [{ price: plan.stripePriceId }],
                metadata: {
                    organizationId,
                    planId,
                },
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
            };

            if (trialDays && trialDays > 0) {
                subscriptionData.trial_period_days = trialDays;
            }

            const subscription = await this.stripe.subscriptions.create(subscriptionData);

            this.logger.log(`Created subscription ${subscription.id} for organization ${organizationId}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to create subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update subscription (change plan)
     */
    async updateSubscription(
        subscriptionId: string,
        newPlanId: string,
        organizationId: string
    ): Promise<Stripe.Subscription> {
        try {
            const plan = this.getPlan(newPlanId);
            if (!plan) {
                throw new Error(`Plan ${newPlanId} not found`);
            }

            if (plan.id === 'free') {
                // Cancel subscription for free plan
                return await this.cancelSubscription(subscriptionId, organizationId);
            }

            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

            const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: plan.stripePriceId,
                }],
                metadata: {
                    organizationId,
                    planId: newPlanId,
                },
                proration_behavior: 'create_prorations',
            });

            this.logger.log(`Updated subscription ${subscriptionId} to plan ${newPlanId}`);
            return updatedSubscription;
        } catch (error) {
            this.logger.error(`Failed to update subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(
        subscriptionId: string,
        organizationId: string,
        atPeriodEnd: boolean = true
    ): Promise<Stripe.Subscription> {
        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: atPeriodEnd,
                metadata: {
                    organizationId,
                    planId: 'free',
                },
            });

            this.logger.log(`Cancelled subscription ${subscriptionId} for organization ${organizationId}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to cancel subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * Reactivate a cancelled subscription
     */
    async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
            });

            this.logger.log(`Reactivated subscription ${subscriptionId}`);
            return subscription;
        } catch (error) {
            this.logger.error(`Failed to reactivate subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get subscription details
     */
    async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        try {
            return await this.stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['customer', 'latest_invoice', 'items.data.price'],
            });
        } catch (error) {
            this.logger.error(`Failed to retrieve subscription: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create usage record for metered billing
     */
    async createUsageRecord(
        subscriptionItemId: string,
        quantity: number,
        timestamp: number = Math.floor(Date.now() / 1000)
    ): Promise<Stripe.UsageRecord> {
        try {
            const usageRecord = await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
                quantity,
                timestamp,
                action: 'increment',
            });

            this.logger.log(`Created usage record for subscription item ${subscriptionItemId}: ${quantity}`);
            return usageRecord;
        } catch (error) {
            this.logger.error(`Failed to create usage record: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get usage records for a subscription item
     */
    async getUsageRecords(
        subscriptionItemId: string,
        startTime?: number,
        endTime?: number
    ): Promise<Stripe.ApiList<Stripe.UsageRecord>> {
        try {
            const params: Stripe.UsageRecordListParams = {};
            if (startTime) params.start = startTime;
            if (endTime) params.end = endTime;

            return await this.stripe.subscriptionItems.listUsageRecordSummaries(subscriptionItemId, params);
        } catch (error) {
            this.logger.error(`Failed to get usage records: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create invoice for overage charges
     */
    async createInvoice(
        customerId: string,
        items: Array<{ price: string; quantity: number; description?: string }>,
        description?: string
    ): Promise<Stripe.Invoice> {
        try {
            const invoice = await this.stripe.invoices.create({
                customer: customerId,
                description,
                collection_method: 'charge_automatically',
                auto_advance: true,
            });

            // Add invoice items
            for (const item of items) {
                await this.stripe.invoiceItems.create({
                    customer: customerId,
                    invoice: invoice.id,
                    price: item.price,
                    quantity: item.quantity,
                    description: item.description,
                });
            }

            // Finalize and send the invoice
            const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
            await this.stripe.invoices.sendInvoice(finalizedInvoice.id);

            this.logger.log(`Created invoice ${invoice.id} for customer ${customerId}`);
            return finalizedInvoice;
        } catch (error) {
            this.logger.error(`Failed to create invoice: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a payment intent for one-time charges
     */
    async createPaymentIntent(
        amount: number,
        currency: string,
        customerId: string,
        metadata?: Record<string, string>
    ): Promise<Stripe.PaymentIntent> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount,
                currency,
                customer: customerId,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            this.logger.log(`Created payment intent ${paymentIntent.id} for customer ${customerId}`);
            return paymentIntent;
        } catch (error) {
            this.logger.error(`Failed to create payment intent: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(
        customerId: string,
        planId: string,
        organizationId: string,
        successUrl: string,
        cancelUrl: string,
        trialDays?: number
    ): Promise<Stripe.Checkout.Session> {
        try {
            const plan = this.getPlan(planId);
            if (!plan) {
                throw new Error(`Plan ${planId} not found`);
            }

            const sessionData: Stripe.Checkout.SessionCreateParams = {
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: plan.stripePriceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    organizationId,
                    planId,
                },
                subscription_data: {
                    metadata: {
                        organizationId,
                        planId,
                    },
                },
            };

            if (trialDays && trialDays > 0) {
                sessionData.subscription_data!.trial_period_days = trialDays;
            }

            const session = await this.stripe.checkout.sessions.create(sessionData);

            this.logger.log(`Created checkout session ${session.id} for organization ${organizationId}`);
            return session;
        } catch (error) {
            this.logger.error(`Failed to create checkout session: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a portal session for customer self-service
     */
    async createPortalSession(
        customerId: string,
        returnUrl: string
    ): Promise<Stripe.BillingPortal.Session> {
        try {
            const session = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });

            this.logger.log(`Created portal session ${session.id} for customer ${customerId}`);
            return session;
        } catch (error) {
            this.logger.error(`Failed to create portal session: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle webhook events
     */
    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
                    break;
                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                    break;
                case 'customer.subscription.trial_will_end':
                    await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
                    break;
                default:
                    this.logger.log(`Unhandled webhook event: ${event.type}`);
            }
        } catch (error) {
            this.logger.error(`Error handling webhook event ${event.type}: ${error.message}`);
            throw error;
        }
    }

    private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
        const organizationId = subscription.metadata.organizationId;
        const planId = subscription.metadata.planId;

        this.logger.log(`Subscription created for organization ${organizationId}, plan: ${planId}`);

        // Update organization billing status in database
        // This would typically call a service to update the organization's billing status
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const organizationId = subscription.metadata.organizationId;
        const planId = subscription.metadata.planId;

        this.logger.log(`Subscription updated for organization ${organizationId}, plan: ${planId}`);

        // Update organization billing status in database
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const organizationId = subscription.metadata.organizationId;

        this.logger.log(`Subscription deleted for organization ${organizationId}`);

        // Downgrade organization to free plan
    }

    private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
        const customerId = invoice.customer as string;

        this.logger.log(`Invoice payment succeeded for customer ${customerId}`);

        // Update organization billing status
    }

    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        const customerId = invoice.customer as string;

        this.logger.log(`Invoice payment failed for customer ${customerId}`);

        // Handle failed payment (send notification, suspend service, etc.)
    }

    private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
        const organizationId = subscription.metadata.organizationId;

        this.logger.log(`Trial will end for organization ${organizationId}`);

        // Send trial ending notification
    }

    /**
     * Check if organization has exceeded plan limits
     */
    checkPlanLimits(
        planId: string,
        usage: UsageMetrics
    ): { exceeded: boolean; limits: Partial<BillingPlan['features']> } {
        const plan = this.getPlan(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found`);
        }

        const limits: Partial<BillingPlan['features']> = {};
        let exceeded = false;

        // Check document limit
        if (plan.features.maxDocuments > 0 && usage.documentsCount > plan.features.maxDocuments) {
            limits.maxDocuments = plan.features.maxDocuments;
            exceeded = true;
        }

        // Check token limit
        if (plan.features.maxTokensPerMonth > 0 && usage.tokensUsed > plan.features.maxTokensPerMonth) {
            limits.maxTokensPerMonth = plan.features.maxTokensPerMonth;
            exceeded = true;
        }

        // Check user limit
        if (plan.features.maxUsers > 0 && usage.usersCount > plan.features.maxUsers) {
            limits.maxUsers = plan.features.maxUsers;
            exceeded = true;
        }

        return { exceeded, limits };
    }

    /**
     * Calculate overage charges
     */
    calculateOverageCharges(
        planId: string,
        usage: UsageMetrics
    ): { total: number; breakdown: Record<string, number> } {
        const plan = this.getPlan(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found`);
        }

        const breakdown: Record<string, number> = {};
        let total = 0;

        // Calculate document overage
        if (plan.features.maxDocuments > 0 && usage.documentsCount > plan.features.maxDocuments) {
            const overage = usage.documentsCount - plan.features.maxDocuments;
            const charge = overage * 0.50; // $0.50 per document
            breakdown.documents = charge;
            total += charge;
        }

        // Calculate token overage
        if (plan.features.maxTokensPerMonth > 0 && usage.tokensUsed > plan.features.maxTokensPerMonth) {
            const overage = usage.tokensUsed - plan.features.maxTokensPerMonth;
            const charge = (overage / 1000) * 0.02; // $0.02 per 1k tokens
            breakdown.tokens = charge;
            total += charge;
        }

        // Calculate user overage
        if (plan.features.maxUsers > 0 && usage.usersCount > plan.features.maxUsers) {
            const overage = usage.usersCount - plan.features.maxUsers;
            const charge = overage * 5; // $5 per user
            breakdown.users = charge;
            total += charge;
        }

        return { total, breakdown };
    }
}
