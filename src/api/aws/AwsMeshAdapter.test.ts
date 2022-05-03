import { moment } from "/deps.ts";
import { MeshPlatform, MeshTenantCost } from "/mesh/mesh-tenant.model.ts";
import { AwsCliFacade } from "./AwsCliFacade.ts";
import { AwsMeshAdapter } from "./AwsMeshAdapter.ts";
import { assertEquals } from "/dev-deps.ts";
import { MeshTenantChangeDetector } from "/mesh/mesh-tenant-change-detector.ts";
import { StubProcessRunner } from "../../process/StubProcessRunner.ts";

const response = {
  GroupDefinitions: [{ Type: "DIMENSION", Key: "LINKED_ACCOUNT" }],
  ResultsByTime: [
    {
      TimePeriod: { Start: "2021-01-01", End: "2021-02-01" },
      Total: {},
      Groups: [
        {
          Keys: ["402561870956"],
          Metrics: { BlendedCost: { Amount: "0.000000155", Unit: "USD" } },
        },
        {
          Keys: ["547225086602"],
          Metrics: { BlendedCost: { Amount: "0.0000003317", Unit: "USD" } },
        },
        {
          Keys: ["579066991346"],
          Metrics: { BlendedCost: { Amount: "0.0000004836", Unit: "USD" } },
        },
        {
          Keys: ["702461728527"],
          Metrics: { BlendedCost: { Amount: "0.0228541822", Unit: "USD" } },
        },
        {
          Keys: ["891243600209"],
          Metrics: { BlendedCost: { Amount: "0.00000543", Unit: "USD" } },
        },
      ],
      Estimated: false,
    },
    {
      TimePeriod: { Start: "2021-02-01", End: "2021-03-01" },
      Total: {},
      Groups: [
        {
          Keys: ["402561870956"],
          Metrics: { BlendedCost: { Amount: "0.000000154", Unit: "USD" } },
        },
        {
          Keys: ["547225086602"],
          Metrics: { BlendedCost: { Amount: "0.0000003304", Unit: "USD" } },
        },
        {
          Keys: ["579066991346"],
          Metrics: { BlendedCost: { Amount: "0.0003440428", Unit: "USD" } },
        },
        {
          Keys: ["602620322307"],
          Metrics: { BlendedCost: { Amount: "0.0038967688", Unit: "USD" } },
        },
        {
          Keys: ["702461728527"],
          Metrics: { BlendedCost: { Amount: "0.1628837257", Unit: "USD" } },
        },
        {
          Keys: ["891243600209"],
          Metrics: { BlendedCost: { Amount: "0.1754088943", Unit: "USD" } },
        },
      ],
      Estimated: false,
    },
    {
      TimePeriod: { Start: "2021-03-01", End: "2021-03-31" },
      Total: {},
      Groups: [
        {
          Keys: ["385027626217"],
          Metrics: { BlendedCost: { Amount: "0.00002", Unit: "USD" } },
        },
        {
          Keys: ["402561870956"],
          Metrics: { BlendedCost: { Amount: "0.00000015", Unit: "USD" } },
        },
        {
          Keys: ["547225086602"],
          Metrics: { BlendedCost: { Amount: "0.000000321", Unit: "USD" } },
        },
        {
          Keys: ["579066991346"],
          Metrics: { BlendedCost: { Amount: "0.000013394", Unit: "USD" } },
        },
        {
          Keys: ["602620322307"],
          Metrics: { BlendedCost: { Amount: "1.1166633659", Unit: "USD" } },
        },
        {
          Keys: ["702461728527"],
          Metrics: { BlendedCost: { Amount: "0.0425271244", Unit: "USD" } },
        },
        {
          Keys: ["891243600209"],
          Metrics: { BlendedCost: { Amount: "0.1422578171", Unit: "USD" } },
        },
      ],
      Estimated: false,
    },
  ],
  DimensionValueAttributes: [
    {
      Value: "402561870956",
      Attributes: { description: "demo-customer.gitc-pw-test" },
    },
    {
      Value: "547225086602",
      Attributes: { description: "demo-customer.gitc-pw-anothertest" },
    },
    { Value: "579066991346", Attributes: { description: "automation" } },
    {
      Value: "702461728527",
      Attributes: { description: "meshstack-dev-aws-root" },
    },
    {
      Value: "891243600209",
      Attributes: { description: "managed-customer.managed-project" },
    },
    {
      Value: "602620322307",
      Attributes: { description: "managed-customer.test2" },
    },
    {
      Value: "385027626217",
      Attributes: { description: "unipipe-e2e-demo.unipipe-demo-dev" },
    },
  ],
};

Deno.test(
  "Requesting the tenant cost info respondes with a proper filled MeshTenant object",
  async () => {
    const runner = new StubProcessRunner();
    const awsCliFacade = new AwsCliFacade(runner);
    const sut = new AwsMeshAdapter(
      awsCliFacade,
      "OrganizationAccountAccessRole",
      {} as MeshTenantChangeDetector,
    );

    runner.setupResultObject(response);

    const start = moment.utc("2021-01-01").startOf("day").toDate();
    const end = moment.utc("2021-03-31").endOf("day").toDate();

    const tenants = [
      {
        platformTenantId: "702461728527",
        platformTenantName: "abc",
        platform: MeshPlatform.AWS,
        tags: [],
        nativeObj: {
          Id: "702461728527",
          Arn: "arn",
          Email: "email",
          Name: "name",
          Status: "status",
          JoinedMethod: "join",
          JoinedTimestamp: "timestamp",
        },
        costs: [],
        roleAssignments: [],
      },
    ];
    await sut.attachTenantCosts(tenants, start, end);

    assertEquals((tenants[0].costs[0] as MeshTenantCost).cost, "0.0228541822");
    assertEquals((tenants[0].costs[1] as MeshTenantCost).cost, "0.1628837257");
    assertEquals((tenants[0].costs[2] as MeshTenantCost).cost, "0.0425271244");
  },
);
