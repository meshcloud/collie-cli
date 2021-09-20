/*
{
  "kind":"bigquery#dataset",
  "id":"meshstack-root:billing_export",
  "datasetReference":{
    "datasetId":"billing_export",
    "projectId":"meshstack-root"
  },
  "location":"US"
}
*/

export interface BigQueryListDatasetResult {
  kind: string;
  id: string;
  datasetReference: BigQueryListDatasetReference;
  location: string;
}

export interface BigQueryListDatasetReference {
  datasetId: string;
  projectId: string;
}

/*
{
  "kind":"bigquery#table",
  "id":"meshstack-root:billing_export.gcp_billing_export_v1_01D314_7440C3_FC79F2",
  "tableReference":{
    "projectId":"meshstack-root",
    "datasetId":"billing_export",
    "tableId":"gcp_billing_export_v1_01D314_7440C3_FC79F2"
  },
  "type":"TABLE",
  "timePartitioning":{
    "type":"DAY"
  },
  "creationTime":"1587046756708"
 }
 */

export interface BigQueryListTableResult {
  kind: string;
  id: string;
  tableReference: BigQueryListTableReference;
  type: string;
  timePartitioning: { type: string };
  creationTime: string;
}

export interface BigQueryListTableReference {
  projectId: string;
  datasetId: string;
  tableId: string;
}