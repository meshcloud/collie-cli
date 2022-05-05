// This is the name of the materialized view in BigQuery that we use to collect cost data.
export const GcpCostCollectionViewName = "collie_billing_view";

export interface GcpBillingExportConfig {
  projectId: string;
  datasetName: string;
}
