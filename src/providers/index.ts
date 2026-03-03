import type { PropertyProvider } from "./property-provider";
import { MockPropertyProvider } from "./mock-property-provider";
import { StellarMlsProvider } from "./stellar-mls-provider";

function createProvider(): PropertyProvider {
  const providerType = process.env.PROPERTY_PROVIDER ?? "mock";

  switch (providerType) {
    case "stellar":
      return new StellarMlsProvider();
    case "mock":
    default:
      return new MockPropertyProvider();
  }
}

export const propertyProvider = createProvider();
