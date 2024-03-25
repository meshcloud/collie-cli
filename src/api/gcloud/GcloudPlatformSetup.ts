import { Select } from "x/cliffy/prompt";
import { PlatformConfigGcp } from "../../model/PlatformConfig.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { Dir } from "../../cli/DirectoryGenerator.ts";
import { PlatformSetup } from "../PlatformSetup.ts";
import { GcloudCliFacade } from "./GcloudCliFacade.ts";
import { MeshError } from "../../errors.ts";
import { organizationId } from "./Model.ts";
import { isWindows } from "../../os.ts";

export class GcloudPlatformSetup extends PlatformSetup<PlatformConfigGcp> {
  constructor(private readonly gcloud: GcloudCliFacade) {
    super();
  }

  async promptInteractively(): Promise<PlatformConfigGcp> {
    // todo: shoudl this be id of the platform instead?
    const { id, name } = await this.promptPlatformName();

    this.progress("detecting available gcloud cli configurations");

    const configurations = await this.gcloud.configurationsList();

    const configurationName = await Select.prompt<string>({
      message: "Select a gcloud CLI configuration",
      options: configurations.map((x) => x.name),
      search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264
      info: true,
    });

    const configuration = configurations.find((x) =>
      x.name === configurationName
    );

    if (!configuration) {
      throw new MeshError(
        "Could not find selected configuration named " + configurationName,
      );
    }

    this.progress("detecting available GCP organizations");
    const organizations = await this.gcloud.listOrganizations();

    const organizationName = await Select.prompt<string>({
      message: "Select a GCP organization",
      options: organizations.map((x) => ({
        name: x.displayName,
        value: x.name,
      })),
      search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264,
      info: true,
    });

    const organization = organizations.find((x) => x.name === organizationName);
    if (!organization) {
      throw new MeshError(
        "Could not find selected organization " + organizationName,
      );
    }

    return {
      id,
      name,
      gcp: {
        organization: organizationId(organization),
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
      name: config.id,
      entries: [{ name: "README.md", content: this.generateReadmeMd(config) }],
    };
  }

  private generateReadmeMd(config: PlatformConfigGcp): string {
    // TODO: include info about GCP org, not just the project
    const frontmatter = config;
    const md = `
# ${config.name}
  
This GCP platform uses the GCP Organization belonging to GCP project ${config.gcp.project}.
`;

    const doc = new MarkdownDocument(frontmatter, md);

    return doc.format();
  }
}
