import { PlatformConfig } from "./PlatformConfig.ts";

export interface FoundationConfig {
  name: string;
  meshStack?: MeshStackConfig;
  platforms: PlatformConfig[];
}

export interface MeshStackConfig {
  apiUrl: string;
  credentialsFile: string;
}

export interface FoundationFrontmatter {
  name: string;
  meshStack?: MeshStackConfig;
}
