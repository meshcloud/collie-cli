import { ShellRunner } from "../process/shell-runner.ts";
import { AwsCliFacade } from "../aws/aws-cli-facade.ts";
import { AwsMeshAdapter } from "../aws/aws-mesh-adapter.ts";
import { AzureMeshAdapter } from "../azure/azure-mesh-adapter.ts";
import { MultiMeshAdapter } from "./multi-mesh-adapter.ts";
import { GcpCliFacade } from "../gcp/gcp-cli-facade.ts";
import { GcpMeshAdapter } from "../gcp/gcp-mesh-adapter.ts";
import { Config } from "../config/config.model.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { TimeWindowCalculator } from "./time-window-calculator.ts";
import { BasicAzureCliFacade } from "../azure/basic-azure-cli-facade.ts";
import { RetryingAzureCliFacadeDecorator } from "../azure/retrying-azure-cli-facade-decorator.ts";
import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { VerboseShellRunner } from "../process/verbose-shell-runner.ts";
import { LoaderShellRunner } from "../process/loader-shell-runner.ts";
import { AutoInstallAzureCliModuleDecorator } from "../azure/auto-install-azure-cli-module-decorator.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { CachingMeshAdapterDecorator } from "./caching-mesh-adapter-decorator.ts";

/**
 * Should consume the cli configuration in order to build the
 * proper adapter.
 */
export class MeshAdapterFactory {
  constructor(
    private readonly config: Config,
  ) {}

  buildMeshAdapter(options: CmdGlobalOptions): MeshAdapter {
    let shellRunner = new ShellRunner();
    if (options.verbose) {
      shellRunner = new VerboseShellRunner(shellRunner);
    } else {
      shellRunner = new LoaderShellRunner(shellRunner);
    }
    const timeWindowCalc = new TimeWindowCalculator();
    const adapters = [];

    if (this.config.connected.AWS) {
      const aws = new AwsCliFacade(shellRunner);
      const awsAdapter = new AwsMeshAdapter(aws);
      adapters.push(awsAdapter);
    }

    if (this.config.connected.Azure) {
      const azure = new BasicAzureCliFacade(shellRunner);
      const autoInstallDecorator = new AutoInstallAzureCliModuleDecorator(
        azure,
      );
      const retryingDecorator = new RetryingAzureCliFacadeDecorator(
        autoInstallDecorator,
      );
      const azureAdapter = new AzureMeshAdapter(
        retryingDecorator,
        timeWindowCalc,
      );
      adapters.push(azureAdapter);
    }

    if (this.config.connected.GCP) {
      const gcp = new GcpCliFacade(shellRunner);
      const gcpAdapter = new GcpMeshAdapter(gcp);
      adapters.push(gcpAdapter);
    }

    // There are multiple ways of doing it. Currently we only fetch everything or nothing, which is easier I guess.
    // we could also split every platform into an individual repository folder and perform fetching and caching on a per-platform
    // basis. For now we go with the easier part.
    const tenantRepository = newMeshTenantRepository();
    const cachingMeshAdapter = new CachingMeshAdapterDecorator(
      tenantRepository,
      new MultiMeshAdapter(adapters),
    );

    return cachingMeshAdapter;
  }
}
