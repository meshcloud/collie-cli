export interface Project {
  createTime: string;
  labels?: { [labelKey: string]: string };
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
