import { EventSchemas, Inngest } from "inngest";

type HomewiseInngestEvents = {
  "automation/trigger": {
    data: {
      contactId: string;
      triggerType: string;
      metadata?: Record<string, unknown>;
    };
  };
  "crm/behavioral.trigger": {
    data: {
      contactId: string;
      ruleId?: string;
      triggerType: string;
    };
  };
  "crm/contact.created": {
    data: {
      contactId: string;
      source: string;
      type: string;
      stage: string;
    };
  };
  "direct-mail/order.submitted": {
    data: {
      orderId: string;
    };
  };
  "mls-sync": {
    data: {
      initialImport?: boolean;
    };
  };
  "mls/sync.continue": {
    data: {
      cursor?: string;
      initialImport?: boolean;
      nextLink?: string;
    };
  };
  "mls/listing.backfilled": {
    data: {
      cursor?: string;
      provider: string;
      total: number;
    };
  };
  "mls/listing.price-changed": {
    data: {
      address: string;
      city: string;
      id: string;
      listingId: string;
      mlsId: string;
      newPrice: number;
      oldPrice: number;
    };
  };
  "mls/listing.synced": {
    data: {
      id: string;
      listingId: string;
      mlsId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "homewise",
  schemas: new EventSchemas().fromRecord<HomewiseInngestEvents>(),
});
