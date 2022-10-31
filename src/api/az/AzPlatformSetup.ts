import { Select } from "/deps.ts";
import { PlatformConfigAzure } from "../../model/PlatformConfig.ts";
import { AzCliFacade } from "./AzCliFacade.ts";
import { MarkdownDocument } from "../../model/MarkdownDocument.ts";
import { Dir } from "../../cli/DirectoryGenerator.ts";
import { PlatformSetup } from "../PlatformSetup.ts";
import { MeshError } from "../../errors.ts";
import { isWindows } from "../../os.ts";

export class AzPlatformSetup extends PlatformSetup<PlatformConfigAzure> {
  constructor(private readonly az: AzCliFacade) {
    super();
  }

  async promptInteractively(): Promise<PlatformConfigAzure> {
    // todo: should this be id of the platform instead?
    // todo: AZURE_CONFIG_DIR?
    const { id, name } = await this.promptPlatformName();

    this.progress("detecting available az accounts (subscriptions)");

    const subscriptions = await this.az.listSubscriptions();

    const subscriptionId = await Select.prompt({
      message:
        "Select an account to configure AAD Tenant Id and default Subscription id",
      options: subscriptions.map((x) => ({
        name: x.name + " / AAD " + x.tenantId,
        value: x.id,
      })),
      search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264
      info: true,
    });

    const subscription = subscriptions.find((x) => x.id === subscriptionId);
    if (!subscription) {
      throw new MeshError(
        "Could not find selected subscription id " + subscriptionId,
      );
    }

    return {
      id,
      name,
      azure: {
        aadTenantId: subscription.tenantId,
        subscriptionId: subscription.id,
      },
      cli: {
        az: {},
      },
    };
  }

  preparePlatformDir(config: PlatformConfigAzure): Dir {
    return {
      name: config.id,
      entries: [
        { name: "README.md", content: this.generateAzureReadmeMd(config) },
      ],
    };
  }

  private generateAzureReadmeMd(config: PlatformConfigAzure): string {
    const frontmatter = config;
    const md = `
# ${config.name}
  
This Azure platform is set up in AAD Tenant ${config.azure.aadTenantId}.
`;

    const doc = new MarkdownDocument(frontmatter, md);

    return doc.format();
  }
}
