export interface Config {
  core?: {
    account?: string;
    project?: string;
  };
}

export type Labels = { [labelKey: string]: string };

export interface Project {
  createTime: string;
  labels?: Labels;
  lifeCycleState: string;
  name: string;
  parent: ProjectParent;
  projectId: string;
  projectNumber: string;
}

export interface ProjectParent {
  id: string;
  type: string;
}

export interface IamResponse {
  id: string;
  policy: IamPolicyInfo;
  type: string; // either 'project', 'folder' or 'organization'
}

export interface IamPolicyInfo {
  bindings: IamBinding[];
  etag: string;
  version: number;
}

export interface IamBinding {
  members: string[];
  role: string;
}

export interface CostBigQueryResult {
  cost: string;
  invoice_month: string;
  project_id?: string;
  currency: string;
}

export function isProject(
  // deno-lint-ignore no-explicit-any
  object: any
): object is Project {
  return "projectId" in object && "projectNumber" in object;
}
