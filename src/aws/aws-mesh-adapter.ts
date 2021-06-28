import { MeshAdapter } from "../mesh/mesh-adapter.ts";
import { AwsCliFacade } from "./aws-cli-facade.ts";
import {
  MeshPlatform,
  MeshTenant,
  MeshTenantCost,
} from "../mesh/mesh-tenant.model.ts";
import { Account, isAccount } from "./aws.model.ts";
import { moment } from "../deps.ts";
import { makeRunWithLimit } from "../run-with-limit.ts";

export class AwsMeshAdapter implements MeshAdapter {
  constructor(
    private readonly awsCli: AwsCliFacade,
  ) {}

  async getMeshTenants(): Promise<MeshTenant[]> {
    const accounts = await this.awsCli.listAccounts();

    const concurrentTagRequests = 5;
    const { runWithLimit } = makeRunWithLimit<MeshTenant>(
      concurrentTagRequests,
    );

    return Promise.all(
      accounts.map((account) =>
        runWithLimit(async () => {
          const tags = await this.awsCli.listTags(account);

          const meshTags = tags.map((t) => {
            return { tagName: t.Key, tagValues: [t.Value] };
          });

          return {
            platformTenantId: account.Id,
            platformTenantName: account.Name,
            platform: MeshPlatform.AWS,
            nativeObj: account,
            tags: meshTags,
            costs: [],
          };
        })
      ),
    );
  }

  async loadTenantCosts(
    tenants: MeshTenant[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const awsTenants = tenants.filter((t) => isAccount(t.nativeObj));
    // As with AWS each query costs $0.01, we query as much as possible in one go to minimize cost.
    const costInfo = await this.awsCli.listCosts(startDate, endDate);

    for (const tenant of awsTenants) {
      // Its already filtered inside awsTenants so we dont need to re-filter here.
      const account = tenant.nativeObj as Account;

      // Note: normally we use [TimeWindowCalculator] for handling time windows, but we assume here that AWS returns the
      // right time periods for slicing the data on a per-month basis.
      for (const result of costInfo.ResultsByTime) {
        const from = moment.utc(result.TimePeriod.Start); // Comes in the format of '2021-01-01'.
        let to = moment(from).endOf("month");
        if (to.isAfter(endDate)) { // If [endDate] is in the middle of the month, we need to prevent 'to' from referring to the end.
          to = moment(endDate);
        }

        const costItem: MeshTenantCost = {
          from: from.toDate().toUTCString(),
          to: to.toDate().toUTCString(),
          totalUsageCost: "0",
          details: [],
        };

        const costForTenant = result.Groups.find((g) =>
          g.Keys[0] === account.Id
        );
        if (costForTenant) {
          costItem.totalUsageCost = costForTenant.Metrics["BlendedCost"].Amount;
        }

        tenant.costs.push(costItem);
      }
    }
    return Promise.resolve();
  }
}
