/**
 * Contains meta information about the tenants in this directory.
 * Can be used to perform some sort of migrations and or control when
 * the last collection took place.
 */
export interface Meta {
  version: number;
  tenantCollection: {
    lastCollection: string;
  };
  iamCollection?: {
    lastCollection: string;
  }
  costCollection?: {
    from: string;
    to: string;
  };
}
