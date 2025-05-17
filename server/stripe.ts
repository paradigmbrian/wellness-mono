import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}

console.log("Stripe secret key:", process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Price IDs for different subscription tiers
export const SUBSCRIPTION_PRICES = {
  // Monthly prices
  basic_monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "N/A",
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "N/A",

  // Yearly prices (with discount)
  basic_yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || "N/A",
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "N/A",
};

/**
 * Create a new customer in Stripe
 */
export async function createCustomer(
  email: string,
  name?: string,
): Promise<Stripe.Customer> {
  try {
    return await stripe.customers.create({
      email,
      name: name || email,
    });
  } catch (error: any) {
    console.error("Error creating Stripe customer:", error);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
}

/**
 * Create a new subscription for a customer
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
  } catch (error: any) {
    console.error("Error creating Stripe subscription:", error);
    throw new Error(`Failed to create Stripe subscription: ${error.message}`);
  }
}

/**
 * Get an existing customer's subscription
 */
export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error: any) {
    console.error("Error retrieving Stripe subscription:", error);
    throw new Error(`Failed to retrieve Stripe subscription: ${error.message}`);
  }
}

/**
 * Update a customer's subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  priceId: string,
): Promise<Stripe.Subscription> {
  try {
    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Find the subscription item ID
    const itemId = subscription.items.data[0].id;

    // Update the subscription with the new price
    return await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: priceId }],
    });
  } catch (error: any) {
    console.error("Error updating Stripe subscription:", error);
    throw new Error(`Failed to update Stripe subscription: ${error.message}`);
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error: any) {
    console.error("Error cancelling Stripe subscription:", error);
    throw new Error(`Failed to cancel Stripe subscription: ${error.message}`);
  }
}
