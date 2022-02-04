import { Select } from "../../deps.ts";
import { MeshTenant } from "../../mesh/mesh-tenant.model.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { MeshError } from "../../errors.ts";
import { setupLogger } from "../../logger.ts";
import { verifyCliAvailability } from "../../init.ts";
import { loadConfig } from "../../config/config.model.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";

export async function detailViewTenant(
  options: CmdGlobalOptions,
  data: MeshTenant[],
  selectedTenantId: string,
  _selectedTag: string,
  noCost: boolean,
) {
  const selectedTenant = data.find((e) =>
    e.platformTenantId == selectedTenantId
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

  if (selectedTenant != undefined) {
    await fetchIAM(options, selectedTenant);

    if (
      selectedTenant?.tags[0] != undefined && selectedTenant?.tags != undefined
    ) {
      console.log("\n\nTags:\n");
      for (const tag of selectedTenant.tags) {
        console.log(tag.tagName + ": " + tag.tagValues);
      }
    }

    console.log("\n");

    if (selectedTenant?.costs != undefined && !noCost) {
      console.log("Costs: \n");

      for (const cost of selectedTenant.costs) {
        if (cost.cost == "") {
          cost.cost = "0";
        }
        console.log(
          "From " + cost.from + " to " + cost.to + ": " + cost.cost + " " +
            cost.currency,
        );
      }

      console.log("\n\n");
    }

    console.log("IAM-Information: \n\n");

    for (const roleAssignment of selectedTenant.roleAssignments) {
      console.log(
        'Name: "' + roleAssignment.principalName + '";\nType: "' +
          roleAssignment.principalType + '";\nRole: "' +
          roleAssignment.roleName + '"\n',
      );
    }
    console.log;

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

async function fetchIAM(options: CmdGlobalOptions, tenant: MeshTenant) {
  await setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  await meshAdapter.attachTenantRoleAssignments([tenant]);

  return tenant;
}
