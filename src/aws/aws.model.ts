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

export interface AccessKey {
  UserName: string;
  Status: string;
  CreateDate: string;
  AccessKeyId: string;
}

export interface AccessKeyResponse {
  AccessKeyMetadata: AccessKey[];
  Marker?: string;
}

export interface Certificate {
  UserName: string;
  Status: string;
  CertificateBody: string;
  CertificateId: string;
  UploadDate: string;
}

export interface CertificateResponse {
  Certificates: Certificate[];
  Marker?: string;
}

export interface SSHPublicKey {
  UserName: string;
  SSHPublicKeyId: string;
  Status: string;
  UploadDate: string;
}

export interface SSHPublicKeysResponse {
  SSHPublicKeys: SSHPublicKey[];
  Marker?: string;
}

export interface ServiceSpecificCredential {
  UserName: string;
  Status: string;
  ServiceUserName: string;
  CreateDate: string;
  ServiceSpecificCredentialId: string;
  ServiceName: string;
}

export interface ServiceSpecificCredentialsResponse {
  ServiceSpecificCredentials: ServiceSpecificCredential[];
  Marker?: string;
}

export interface MFADevice {
  UserName: string;
  SerialNumber: string;
  EnableDate: string;
}

export interface MFADevicesResponse {
  MFADevices: MFADevice[];
  Marker?: string;
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

export interface AttachedPolicy {
  PolicyName: string;
  PolicyArn: string;
}

export interface AttachedPolicyResponse {
  AttachedPolicies: AttachedPolicy[];
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

export function isAccount(
  // deno-lint-ignore no-explicit-any
  object: any,
): object is Account {
  return "Id" in object && "Name" in object;
}
