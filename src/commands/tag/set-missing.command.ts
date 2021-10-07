import { clone, Command, Input } from "../../deps.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { setupLogger } from "../../logger.ts";
import { verifyCliAvailability } from "../../init.ts";
import { loadConfig } from "../../config/config.model.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";
import { MeshAdapter } from "../../mesh/mesh-adapter.ts";
import { MeshTenant } from "../../mesh/mesh-tenant.model.ts";
import { MeshInvalidTagValueError } from "../../errors.ts";

export const setMissingTags = new Command()
  .description(
    "Fix all tenants missing the given tag. Collie will ask you per tenant what the value should be and writes the change to the cloud platform(s).",
  )
  .action(setMissingTagsAction);

async function setMissingTagsAction(options: CmdGlobalOptions, tagKey: string) {
  setupLogger(options);
  await verifyCliAvailability();

  const config = loadConfig();
  const meshAdapterFactory = new MeshAdapterFactory(config);
  const meshAdapter = meshAdapterFactory.buildMeshAdapter(options);

  const allTenants = await meshAdapter.getMeshTenants();

  const tenantsMissingTag = allTenants.filter((x) =>
    !x.tags.find((y) => y.tagName === tagKey)
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
