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

export interface RegionsResponse {
  Regions: Region[];
}

export interface Region {
  Endpoint: string;
  RegionName: string;
  OptInStatus: string;
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

export interface Credentials {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: string;
}

export interface CallerIdentity {
  UserId: string;
  Account: string;
  Arn: string;
}

export interface AssumedRoleUser {
  AssumedRoleId: string;
  Arn: string;
}

export interface AssumedRoleResponse {
  Credentials: Credentials;
  AssumedRoleUser: AssumedRoleUser;
}

export interface User {
  UserName: string;
  Path: string;
  CreateDate: string;
  UserId: string;
  Arn: string;
  PasswordLastUsed: string;
}

export interface UserResponse {
  Users: User[];
  Group: Group;
  NextToken?: string;
}

export interface Group {
  Path: string;
  CreateDate: string;
  GroupId: string;
  Arn: string;
  GroupName: string;
}

export interface GroupResponse {
  Groups: Group[];
  NextToken?: string;
}

export interface UserGroupsResponse {
  Groups: Group[];
  NextToken?: string;
}

export interface Policy {
  PolicyName: string;
  PolicyArn: string;
}

export interface PolicyResponse {
  AttachedPolicies: Policy[];
  /**
   * Present if truncated and a paginated query must be done to fetch
   * all.
   */
  Marker?: string;
}

export interface InlinePolicyResponse {
  PolicyNames: string[];
  /**
   * Present if truncated and a paginated query must be done to fetch
   * all.
   */
  Marker?: string;
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
