import Stripe from "stripe";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  return new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

export const stripe = globalForStripe.stripe ?? getStripeClient();

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;
