import { moment } from "../deps.ts";
import { assertThrowsAsync } from "../dev-deps.ts";
import { MeshAzurePlatformError } from "../errors.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { IShellRunner } from "../process/shell-runner.interface.ts";
import { Subscription } from "./azure.model.ts";
import { BasicAzureCliFacade } from "./basic-azure-cli-facade.ts";

class MockShellRunner implements IShellRunner {
  constructor(
    public output: ShellOutput,
  ) {}

  run(_: string): Promise<ShellOutput> {
    return Promise.resolve(this.output);
  }
}

const subscription: Subscription = {
  cloudName: "Sub",
  homeTenantId: "tenant-id",
  id: "1234-1234-1234",
  isDefault: true,
  name: "Sub",
  state: "active",
  tenantId: "tenant-id",
  user: {
    name: "user",
    type: "user",
  },
};

Deno.test("getConsumptionInformation when quering a non supported Subscription throws", () => {
  const shellRunner = new MockShellRunner({
    code: 1,
    stdout: "",
    stderr:
      "Command group 'consumption' is in preview. It may be changed/removed in a future release.\n(422) Cost Management supports only " +
      "Enterprise Agreement, Web direct and Microsoft Customer Agreement offer types. Subscription <sub-id> is not associated with a valid " +
      "offer type.Cost Management supports only Enterprise Agreement, Web direct and Microsoft Customer Agreement offer types. Subscription <sub-id> " +
      "is not associated with a valid offer type. (Request ID: 6e7bad96-a511-48fa-86fd-cf4569b26e70)\n",
  });
  const sut = new BasicAzureCliFacade(shellRunner);

  assertThrowsAsync(
    () => {
      const start = moment("2021-01-01").toDate();
      const end = moment("2021-01-31").toDate();

      return sut.getConsumptionInformation(subscription, start, end);
    },
    MeshAzurePlatformError,
  );
});
