import { clone, Command, Input } from "../../deps.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { CLI } from "/info.ts";
import { MeshAdapter } from "../../mesh/MeshAdapter.ts";
import { MeshTenant } from "../../mesh/MeshTenantModel.ts";
import { MeshInvalidTagValueError } from "../../errors.ts";
import { TenantCommandOptions } from "./TenantCommandOptions.ts";
import { prepareTenantCommand } from "./prepareTenantCommand.ts";

export function registerSetMissingTagCommand(program: Command) {
  program
    .command("set-missing-tag <foundation> <tagKey>")
    .description(
      "Fix all tenants missing the given tag interactively",
    )
    .example(
      "Set a tag value for all tenants that are missing the given 'environment' tag",
      `${CLI} tenant set-missing-tag <foundation> environment`,
    )
    .action(setMissingTagsAction);
}

async function setMissingTagsAction(
  options: TenantCommandOptions & CmdGlobalOptions,
  foundation: string,
  tagKey: string,
) {
  const { meshAdapter } = await prepareTenantCommand(options, foundation);

  const allTenants = await meshAdapter.getMeshTenants();

  const tenantsMissingTag = allTenants.filter(
    (x) => !x.tags.find((y) => y.tagName === tagKey),
  );

  console.log(
    `We have identified ${tenantsMissingTag.length} tenants without the tag "${tagKey}". You'll be able to set the tag values for these tenants now.`,
  );

  let count = 1;
  for (const tenant of tenantsMissingTag) {
    await askAndSetTag(
      tagKey,
      tenant,
      meshAdapter,
      count,
      tenantsMissingTag.length,
    );
    count++;
  }
}

async function askAndSetTag(
  tagKey: string,
  tenant: MeshTenant,
  meshAdapter: MeshAdapter,
  count: number,
  totalCount: number,
) {
  const prefix = `(${count}/${totalCount})`;
  const tagValue: string = await Input.prompt({
    message:
      `${prefix} For the tenant ${tenant.platformTenantName} (${tenant.platformTenantId}) on ${tenant.platform}, what tag value do you want to set for "${tagKey}"? (Leave empty to skip)`,
  });

  if (tagValue !== "") {
    // Skip this tenant if the user does not give any value.
    const originalTenant = clone(tenant);
    tenant.tags.push({ tagName: tagKey, tagValues: [tagValue] });
    try {
      await meshAdapter.updateMeshTenant(tenant, originalTenant);
    } catch (e) {
      if (e instanceof MeshInvalidTagValueError) {
        console.log(
          `You have entered an invalid tag value (${tagValue}) which is not supported by the platform. Please try again with a different value.`,
        );
        await askAndSetTag(
          tagKey,
          originalTenant,
          meshAdapter,
          count,
          totalCount,
        );
      } else {
        throw e;
      }
    }
  }
}
