import { PlatformConfig } from "./PlatformConfig.ts";

export interface FoundationConfig {
  id: string;
  name: string;
  meshStack?: MeshStackConfig;
  platforms: PlatformConfig[];
}

export interface MeshStackConfig {
  apiUrl: string;
  credentialsFile: string;
}

/**
 * The frontmatter stored in a foundation/x/README.md file
 */
export interface FoundationFrontmatter {
  name?: string;
  meshStack?: MeshStackConfig;
}
