export interface AccountResponse {
  Accounts: Account[];
  NextToken?: string;
}

export interface Account {
  Id: string;
  Arn: string;
  Email: string;
  Name: string;
  Status: string;
  JoinedMethod: string;
  JoinedTimestamp: string;
}

export interface TagResponse {
  Tags: Tag[];
}

export interface Tag {
  Key: string;
  Value: string;
}

export interface CostResponse {
  GroupDefinitions: GroupDefinition[];
  ResultsByTime: CostResult[];
  DimensionValueAttributes: DimensionValueAttribute[];
  NextPageToken?: string;
}

export interface GroupDefinition {
  Type: string;
  Key: string;
}

export interface CostResult {
  TimePeriod: TimePeriod;
  Total: Record<string, unknown>;
  Groups: CostGroup[];
  Estimated: boolean; // Whether the result is estimated. (??)
}

export interface TimePeriod {
  Start: string; // 2021-01-01
  End: string; // 2021-02-01
}

export interface CostGroup {
  Keys: string[]; // ["402239812334"]
  Metrics: { [metricKey: string]: CostMetric }; // "Metrics": { "BlendedCost": { "Amount": "0.000000155", "Unit": "USD" } }
}

export interface CostMetric {
  Amount: string; // 0.00000000155
  Unit: string; // USD
}

/**
{
  "Value": "402561870956",
  "Attributes": {
      "description": "demo-customer.gitc-pw-test"
  }
}
 */
export interface DimensionValueAttribute {
  Value: string;
  Attributes: { description: string };
}

export function isAccount(
  // deno-lint-ignore no-explicit-any
  object: any,
): object is Account {
  return "Id" in object && "Name" in object;
}
