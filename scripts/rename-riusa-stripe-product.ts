import { config } from "dotenv";
config({ path: ".env.local" });

import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});
const prisma = new PrismaClient();

async function main() {
  const bundle = await prisma.productConfig.findUnique({
    where: { slug: "riusa_annual_dues" },
    select: { stripeProductId: true, name: true, description: true },
  });

  if (!bundle?.stripeProductId) {
    console.log("No riusa_annual_dues bundle or missing stripeProductId — nothing to rename.");
    return;
  }

  const existing = await stripe.products.retrieve(bundle.stripeProductId);
  if (existing.name === bundle.name && existing.description === bundle.description) {
    console.log(`Stripe product ${existing.id} already up to date.`);
    return;
  }

  const updated = await stripe.products.update(bundle.stripeProductId, {
    name: bundle.name,
    description: bundle.description,
    metadata: { ...existing.metadata, slug: "riusa_annual_dues" },
  });

  console.log(`Renamed Stripe product: ${updated.id} -> "${updated.name}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
