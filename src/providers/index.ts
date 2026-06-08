import type { PropertyProvider } from "./property-provider";
import { mlsPublicSearchEnabled } from "@/lib/mls-launch";
import { MockPropertyProvider } from "./mock-property-provider";
import { StellarMlsProvider } from "./stellar-mls-provider";

export function createProvider(): PropertyProvider {
  const providerType = process.env.PROPERTY_PROVIDER ?? "mock";

  switch (providerType) {
    case "stellar":
      return mlsPublicSearchEnabled()
        ? new StellarMlsProvider()
        : new MockPropertyProvider();
    case "mock":
    default:
      return new MockPropertyProvider();
  }
}

export const propertyProvider = createProvider();
