export interface Configuration {
  name: string;
  properties: {
    core: {
      account?: string;
      project: string;
    };
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

export interface Organization {
  displayName: string;

  /**
   * this is in the format organizations/$id
   */
  name: string;
}

export function organizationId(org: Organization) {
  return org.name.substring("organizations/".length);
}

export interface Folder {
  displayName: string;

  /**
   * this is in the format folders/$id
   */
  name: string;

  /**
   * this is a Folder.name or Organization.name
   */
  parent: string;
}

export function folderId(folder: Folder) {
  return folder.name.substring("folders/".length);
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
