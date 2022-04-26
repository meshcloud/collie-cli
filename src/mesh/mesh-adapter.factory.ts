import { ShellRunner } from "../process/shell-runner.ts";
import { AwsCliFacade } from "/aws/aws-cli-facade.ts";
import { AwsMeshAdapter } from "/aws/aws-mesh-adapter.ts";
import { AwsShellRunner } from "/aws/aws-shell-runner.ts";
import { AzureMeshAdapter } from "/azure/azure-mesh-adapter.ts";
import { MultiMeshAdapter } from "./multi-mesh-adapter.ts";
import { GcpCliFacade } from "/gcp/gcp-cli-facade.ts";
import { GcpMeshAdapter } from "/gcp/gcp-mesh-adapter.ts";
import { CLICommand, Config } from "../config/config.model.ts";
import { MeshAdapter } from "./mesh-adapter.ts";
import { TimeWindowCalculator } from "./time-window-calculator.ts";
import { BasicAzureCliFacade } from "/azure/basic-azure-cli-facade.ts";
import { RetryingAzureCliFacadeDecorator } from "/azure/retrying-azure-cli-facade-decorator.ts";
import { CmdGlobalOptions } from "../commands/cmd-options.ts";
import { VerboseShellRunner } from "../process/verbose-shell-runner.ts";
import { LoaderShellRunner } from "../process/loader-shell-runner.ts";
import { AutoInstallAzureCliModuleDecorator } from "/azure/auto-install-azure-cli-module-decorator.ts";
import { newMeshTenantRepository } from "../db/mesh-tenant-repository.ts";
import { CachingMeshAdapterDecorator } from "./caching-mesh-adapter-decorator.ts";
import { isatty, TTY } from "../commands/tty.ts";
import { AzureCliFacade } from "/azure/azure-cli-facade.ts";
import { StatsMeshAdapterDecorator } from "./stats-mesh-adapter-decorator.ts";
import { MeshPlatform } from "./mesh-tenant.model.ts";
import { QueryStatistics } from "./query-statistics.ts";
import { isWindows } from "../os.ts";
import { MeshError } from "../errors.ts";
import { MeshTenantChangeDetector } from "./mesh-tenant-change-detector.ts";

/**
 * Should consume the cli configuration in order to build the
 * proper adapter.
 */
export class MeshAdapterFactory {
  constructor(private readonly config: Config) {}

  buildMeshAdapter(
    options: CmdGlobalOptions,
    queryStats?: QueryStatistics,
  ): MeshAdapter {
    let shellRunner = new ShellRunner();

    if (options.verbose) {
      shellRunner = new VerboseShellRunner(shellRunner);
    } else if (isatty && !isWindows) {
      shellRunner = new LoaderShellRunner(shellRunner, new TTY());
    }

    const timeWindowCalc = new TimeWindowCalculator();
    const tenantChangeDetector = new MeshTenantChangeDetector();
    const adapters: MeshAdapter[] = [];

    if (this.config.connected.AWS) {
      const selectedProfile = this.config.aws.selectedProfile;
      if (!selectedProfile) {
        throw new MeshError(
          `No AWS CLI profile selected. Please run '${CLICommand} config aws' to configure it`,
        );
      }

      const accountAccessRole = this.config.aws.accountAccessRole;
      if (!accountAccessRole) {
        throw new MeshError(
          `No AWS CLI access role defined. Please run '${CLICommand} config aws' to configure it`,
        );
      }

      const awsShellRunner = new AwsShellRunner(shellRunner, selectedProfile);
      const aws = new AwsCliFacade(awsShellRunner);
      const awsAdapter = new AwsMeshAdapter(
        aws,
        accountAccessRole,
        tenantChangeDetector,
      );

      if (queryStats) {
        const statsDecorator = new StatsMeshAdapterDecorator(
          awsAdapter,
          MeshPlatform.AWS,
          1,
          queryStats,
        );
        adapters.push(statsDecorator);
      } else {
        adapters.push(awsAdapter);
      }
    }

    if (this.config.connected.Azure) {
      let azure: AzureCliFacade = new BasicAzureCliFacade(shellRunner);

      // We can only ask the user if we are in a tty terminal.
      if (isatty) {
        azure = new AutoInstallAzureCliModuleDecorator(azure);
      }

      const retryingDecorator = new RetryingAzureCliFacadeDecorator(azure);
      const azureAdapter = new AzureMeshAdapter(
        retryingDecorator,
        tenantChangeDetector,
      );

      if (queryStats) {
        const statsDecorator = new StatsMeshAdapterDecorator(
          azureAdapter,
          MeshPlatform.Azure,
          1,
          queryStats,
        );
        adapters.push(statsDecorator);
      } else {
        adapters.push(azureAdapter);
      }
    }

    if (this.config.connected.GCP) {
      if (!this.config.gcp || !this.config.gcp.billingExport) {
        throw new MeshError(
          `GCP is missing cost collection configuration. Please run "${CLICommand} config gcp" to set it up.`,
        );
      }
      const gcp = new GcpCliFacade(shellRunner, this.config.gcp.billingExport);
      const gcpAdapter = new GcpMeshAdapter(
        gcp,
        timeWindowCalc,
        tenantChangeDetector,
      );

      if (queryStats) {
        const statsDecorator = new StatsMeshAdapterDecorator(
          gcpAdapter,
          MeshPlatform.GCP,
          1,
          queryStats,
        );
        adapters.push(statsDecorator);
      } else {
        adapters.push(gcpAdapter);
      }
    }

    // There are multiple ways of doing it. Currently we only fetch everything or nothing, which is easier I guess.
    // we could also split every platform into an individual repository folder and perform fetching and caching on a per-platform
    // basis. For now we go with the easier part.
    const tenantRepository = newMeshTenantRepository();

    const cachingMeshAdapter = new CachingMeshAdapterDecorator(
      tenantRepository,
      new MultiMeshAdapter(adapters),
    );

    if (queryStats) {
      return new StatsMeshAdapterDecorator(
        cachingMeshAdapter,
        "cache",
        0,
        queryStats,
      );
    }

    return cachingMeshAdapter;
  }
}
