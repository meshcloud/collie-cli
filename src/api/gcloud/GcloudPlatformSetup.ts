import { Select } from "/deps.ts";
import { PlatformConfigGcp } from "../../model/PlatformConfig.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { Dir } from "../../cli/DirectoryGenerator.ts";
import { PlatformSetup } from "../PlatformSetup.ts";
import { GcloudCliFacade } from "./GcloudCliFacade.ts";
import { MeshError } from "../../errors.ts";

export class GcloudPlatformSetup extends PlatformSetup<PlatformConfigGcp> {
  constructor(private readonly gcloud: GcloudCliFacade) {
    super();
  }

  async promptInteractively(): Promise<PlatformConfigGcp> {
    // todo: shoudl this be id of the platform instead?
    const name = await this.promptPlatformName();

    this.progress("detecting available gcloud cli configurations");

    const configurations = await this.gcloud.configurationsList();

    const configurationName = await Select.prompt({
      message: "Select a gcloud CLI configuraiton",
      options: configurations.map((x) => x.name),
      search: true,
      info: true,
    });

    const configuration = configurations.find(
      (x) => x.name === configurationName,
    );

    if (!configuration) {
      throw new MeshError(
        "Could not find selected configuration named " + configurationName,
      );
    }

    return {
      name: name,
      gcp: {
        project: configuration.properties.core.project,
      },
      cli: {
        gcloud: {
          CLOUDSDK_ACTIVE_CONFIG_NAME: configuration.name,
        },
      },
    };
  }

  preparePlatformDir(config: PlatformConfigGcp): Dir {
    return {
      name: config.name,
      entries: [{ name: "README.md", content: this.generateReadmeMd(config) }],
    };
  }

  private generateReadmeMd(config: PlatformConfigGcp): string {
    // TODO: include info about GCP org, not just the project
    const frontmatter = config;
    const md = `
# GCP
  
This GCP platform uses the GCP Organization belonging to GCP project ${config.gcp.project}.
`;

    const doc = new MarkdownDocument(frontmatter, md);

    return doc.format();
  }
}
