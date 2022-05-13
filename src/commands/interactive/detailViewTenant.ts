import { Select } from "../../deps.ts";
import { MeshError } from "../../errors.ts";
import { MeshTenant } from "../../mesh/MeshTenantModel.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { prepareTenantCommand } from "../tenant/prepareTenantCommand.ts";

export async function detailViewTenant(
  options: GlobalCommandOptions,
  foundation: string,
  data: MeshTenant[],
  selectedTenantId: string,
  noCost: boolean,
) {
  const selectedTenant = data.find(
    (e) => e.platformTenantId == selectedTenantId,
  );

  console.clear();
  console.log("\n\n\n--------------------------");
  console.log(
    'Detailview of Tenant "' + selectedTenant?.platformTenantName + '"',
  );
  console.log("--------------------------\n \n");
  console.log("Name: " + selectedTenant?.platformTenantName);
  console.log("ID: " + selectedTenant?.platformTenantId);
  console.log("Platform: " + selectedTenant?.platform);

  if (selectedTenant) {
    await fetchIAM(options, foundation, selectedTenant);

    // -- TAGS
    console.log("\n\nTags:\n");
    if (
      selectedTenant?.tags[0] != undefined &&
      selectedTenant?.tags != undefined
    ) {
      for (const tag of selectedTenant.tags) {
        console.log(tag.tagName + ": " + tag.tagValues);
      }
    } else {
      console.log("-NONE-\n");
    }

    console.log("\n");

    // -- COSTS
    console.log("Costs: \n");
    if (selectedTenant?.costs != undefined && !noCost) {
      for (const cost of selectedTenant.costs) {
        if (cost.cost == "") {
          cost.cost = "0";
        }
        console.log(
          "From " +
            cost.from +
            " to " +
            cost.to +
            ": " +
            cost.cost +
            " " +
            cost.currency,
        );
      }

      console.log("\n\n");
    } else {
      console.log("-NONE-\n");
    }

    // -- IAM
    console.log("IAM-Information: \n\n");

    if (selectedTenant.roleAssignments.length > 0) {
      for (const roleAssignment of selectedTenant.roleAssignments) {
        console.log(
          'Name: "' +
            roleAssignment.principalName +
            '";\nType: "' +
            roleAssignment.principalType +
            '";\nRole: "' +
            roleAssignment.roleName +
            '"\n',
        );
      }
    } else {
      console.log("-NONE-\n");
    }

    console.log("\n");
    switch (
      await Select.prompt({
        message: "Select what you want to do",
        options: [
          { name: "BACK", value: "BACK" },
          { name: "QUIT", value: "QUIT" },
        ],
      })
    ) {
      case "BACK": {
        console.clear();
        break;
      }
      case "QUIT": {
        Deno.exit();
        break;
      }
      default: {
        throw new MeshError("Invalid value. Something went horribly wrong.");
      }
    }
  } else {
    throw new MeshError("Tenant is undefined. Something went horribly wrong!");
  }
}

async function fetchIAM(
  options: GlobalCommandOptions,
  foundation: string,
  tenant: MeshTenant,
) {
  const { meshAdapter } = await prepareTenantCommand(
    { ...options, refresh: false },
    foundation,
  );

  await meshAdapter.attachTenantRoleAssignments([tenant]);

  return tenant;
}
