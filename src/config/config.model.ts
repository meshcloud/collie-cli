// Use the CLI Name when mentioning it somewhere in a sentence, e.g.: Have fun using ${CLIName}!
export const CLIName = "Collie";
// Use the CLI Command when mentioning it as a command to run, e.g.: Please run "${CLICommand} -h" to see more.
// Don't forget to put quotes ("") around a command to make it clear what exact part of the sentence is the command.
export const CLICommand = CLIName.toLowerCase();
export const GitHubUrl = "https://github.com/meshcloud/collie-cli";

// This is the name of the materialized view in BigQuery that we use to collect cost data.
export const GcpCostCollectionViewName = "collie_billing_view";

export interface GcpBillingExportConfig {
  projectId: string;
  datasetName: string;
}
