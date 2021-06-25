export interface User {
  name: string;
  type: string;
}

export interface Subscription {
  cloudName: string;
  homeTenantId: string;
  id: string;
  isDefault: boolean;
  name: string;
  state: string;
  tenantId: string;
  user: User;
}

export interface Tag {
  count: {
    type: string;
    value: number;
  };

  id: string;
  tagName: string;
  values: [{
    count: {
      type: string;
      value: number;
    };
    id: string;
    tagValue: string;
  }];
}

/**
 * This is hardcoded to match the response from the used CLI call.
 * If the call is modified this structure needs to be adapted as well.
 */
export interface ConsumptionInfo {
  id: string;
  accountName: string | null;
  bellingPeriodId: string;
  consumedService: string;
  costCenter: string | null;
  currency: string;
  instanceId: string;
  instanceLocation: string;
  instanceName: string;
  invoiceId: string | null;
  meterId: string;
  isEstimated: boolean;
  name: string;
  pretaxCost: string; // sadly a string needs to be converted into a number later on
  subscriptionGuid: string;
  subscriptionName: string;
  tags: { [key: string]: string };
  type: string;
  usageEnd: string;
  usageQuantity: string;
  usageStart: string;
}

export function isSubscription(
  // deno-lint-ignore no-explicit-any
  object: any,
): object is Subscription {
  return "tenantId" in object && "id" in object;
}
