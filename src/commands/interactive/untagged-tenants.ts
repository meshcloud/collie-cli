import { loadConfig } from "../../config/config.model.ts";
import { moment, Select } from "../../deps.ts";
import { verifyCliAvailability } from "../../init.ts";
import { setupLogger } from "../../logger.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";
import { QueryStatistics } from "../../mesh/query-statistics.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { MeshError } from "../../errors.ts";
import {
  sortTenantDataByCost,
  sortTenantDataByName,
} from "./sortTenantData.ts";
import { MeshTenant } from "../../mesh/mesh-tenant.model.ts";
import { detailViewTenant } from "./detailViewTenant.ts";
import { interactiveDate } from "./inputInteractiveDate.ts";
import { CLIName} from "../../config/config.model.ts";

export async function exploreInteractive(options: CmdGlobalOptions) {
  const help =
    '\n\n\nThis is the mode, which allows you to work with tenants with missing tags.\n\n\n"SORT BY HIGHEST COST"\nAllows you to sort the tenants without a tag by date. This will allow you to find the "worst offenders", tenants with high costs and missing tags. You\’ll see the effect in the prompt after the next prompt.\n\n"SORT BY Name"\nSorts the tenants in the next prompt by name.\n';  
  let running = true;
  console.clear();  
  console.log(
    `Welcome to the interactive mode of ${CLIName}. Have fun herding your tenants.`,
  );

  while (running) {
    const action: string = await Select.prompt({
      message: "Select what you want to do",
      options: [
        { name: "SORT BY HIGHEST COST", value: "sortbycost" },
        { name: "SORT BY NAME", value: "sortbyname" },
        { name: "HELP", value: "help" },
        { name: "BACK", value: "back" },
        { name: "QUIT", value: "quit" },
      ],
    });

    switch (action) {
      case "sortbycost": {
        const startDate = await interactiveDate(options, "Startdate");
        if (startDate == "BACK") {
          break;
        }
        const endDate = await interactiveDate(options, "Enddate?");
        if (endDate == "BACK") {
          break;
        }
        await showUntagged(
          options,
          await getData(options, startDate, endDate),
          startDate,
          endDate,
          true,
        );
        break;
      }
      case "sortbyname": {
        const startDate = await interactiveDate(options, "Startdate");
        if (startDate == "BACK") {
          break;
        }
        const endDate = await interactiveDate(options, "Enddate?");
        if (endDate == "BACK") {
          break;
        }
        await showUntagged(
          options,
          await getData(options, startDate, endDate),
          startDate,
          endDate,
          false,
        );
        break;
      }
      case "help": {
        console.clear();
        console.log(help);
        break;
      }
      case "back": {
        running = false;
        console.clear();
        break;
      }
      case "quit": {
        Deno.exit();
        break;
      }
      default: {
        throw new MeshError("Invalid value. Something went horribly wrong.");
      }
    }
  }
}

async function getData(
  options: CmdGlobalOptions,
  from: string | undefined = undefined,
  to: string | undefined = undefined,
) {
  setupLogger(options);
  await verifyCliAvailability();

  if ((from == undefined || "") && (to == undefined || "")) {
    const config = loadConfig();
    const meshAdapterFactory = new MeshAdapterFactory(config);
    const queryStatistics = new QueryStatistics();
    const meshAdapter = meshAdapterFactory.buildMeshAdapter(
      options,
      queryStatistics,
    );

    const allTenants = await meshAdapter.getMeshTenants();
    return allTenants;
  } else if (from != undefined) {
    const config = loadConfig();
    const meshAdapterFactory = new MeshAdapterFactory(config);
    const queryStatistics = new QueryStatistics();
    const meshAdapter = meshAdapterFactory.buildMeshAdapter(
      options,
      queryStatistics,
    );

    // We create UTC dates because we do not work with time, hence we do not care about timezones.
    const start = moment.utc(from).startOf("day").toDate();
    if (isNaN(start.valueOf())) {
      throw new MeshError(
        `You have entered an invalid date for '--from':  ${from}`,
      );
    }
    const end = moment.utc(to).endOf("day").toDate();
    if (isNaN(start.valueOf())) {
      throw new MeshError(
        `You have entered an invalid date for '--to': ${to}`,
      );
    }

    // Every of these methods can throw e.g. because a CLI tool was not installed we should think about
    // how to do error management to improve UX.
    const allTenants = await meshAdapter.getMeshTenants();

    await meshAdapter.attachTenantCosts(allTenants, start, end);
    return allTenants;
  } else {
    throw new MeshError("Something went horribly wrong.");
  }
}

async function showUntagged(
  options: CmdGlobalOptions,
  data: MeshTenant[],
  from: string | undefined = undefined,
  to: string | undefined = undefined,
  sortByCost: boolean,
) {
  console.clear();
  const tags = getAllTags(data);
  let running = true;

  if (sortByCost) {
    data = sortTenantDataByCost(options, data);
  } else {
    data = sortTenantDataByName(options, data);
  }
  while (running) {
    const selectedTag = await selectTag(tags);
    if (selectedTag == "BACK") {
      running = false;
    } else {
      const untaggedTenant: Array<MeshTenant> | undefined = [];

      for (const tenant of data) {
        if (filterForTag(options, tenant, selectedTag) == false) {
          untaggedTenant.push(tenant);
        }
      }
      let runningInside = true;
      while (runningInside) {
        const selectedTenant = await selectTenant(
          untaggedTenant,
          undefined,
          sortByCost,
        );
        if (selectedTenant == "BACK") {
          runningInside = false;
        } else {
          await detailViewTenant(
            options,
            data,
            selectedTenant,
            selectedTag,
            from == undefined || to == undefined,
          );
        }
      }
    }
  }
}

function filterForTag(
  _options: CmdGlobalOptions,
  tenant: MeshTenant,
  tagName: string,
) {
  let result = false;
  for (const tag of tenant.tags) {
    if (tag.tagName == tagName) {
      result = true;
    }
  }
  return result;
}

async function selectTag(
  tags: Array<string>,
  additionalOptions: Array<string> = [],
) {
  const options: Array<Promptoptions> = [];
  const help =
    `\n\n\nHere you can select a tag, which should be missing on the tenants shown in the next step. This allows ${CLIName} to filter all tenants, which allready have this tag assigned, from the selection in the next prompt. \n\n\n`;

  for (const tag of tags) {
    options.push({ value: tag, name: tag });
  }
  for (const additionalOption of additionalOptions) {
    options.push({ value: additionalOption, name: additionalOption });
  }
  options.push({ value: "HELP", name: "HELP" });
  options.push({ value: "BACK", name: "BACK" });
  options.push({ value: "QUIT", name: "QUIT" });

  let selection = await Select.prompt({
    message: "Select a tag",
    options: options,
  });
  if (selection == "QUIT") {
    Deno.exit();
  } else if (selection == "BACK") {
    console.clear();
  } else if (selection == "HELP") {
    console.clear();
    console.log(help);
    selection = await selectTag(tags, additionalOptions);
  }
  return selection;
}

async function selectTenant(
  tenants: Array<MeshTenant>,
  additionalOptions: Array<string> = [],
  sortByCost: boolean,
) {
  const options: Array<Promptoptions> = [];
  const help =
    '\n\n\nThis is the last step. If you\'ve selected "SORT BY HIGHEST COST" on one of the previous prompts, this list is now sorted by cost generated by the tenant in the given time period (high costs at the top, low at the bottom).\nSelect a tenant to get more information.\n\n\n';
  for (const tenant of tenants) {
    options.push({
      value: tenant.platformTenantId,
      name: tenant.platformTenantName + " - Cost: " + getTotal(tenant),
    });
  }
  for (const additionalOption of additionalOptions) {
    options.push({ value: additionalOption, name: additionalOption });
  }
  options.push({ value: "HELP", name: "HELP" });
  options.push({ value: "BACK", name: "BACK" });
  options.push({ value: "QUIT", name: "QUIT" });
  let selection = await Select.prompt({
    message: "Select a tenant",
    options: options,
  });
  if (selection == "QUIT") {
    Deno.exit();
  } else if (selection == "BACK") {
    console.clear();
  } else if (selection == "HELP") {
    console.clear();
    console.log(help);
    selection = await selectTenant(tenants, additionalOptions, sortByCost);
  }
  return selection;
}

function getTotal(tenant: MeshTenant) {
  let total = 0;
  const currency = tenant.costs[0].currency;
  for (const tenantCost of tenant.costs) {
    total += Number(tenantCost.cost);
  }
  return total.toString() + currency;
}

function getAllTags(data: MeshTenant[]) {
  const tagsarray: Array<string> = [];
  for (const tenant of data) {
    for (const tag of tenant.tags) {
      if (tagsarray.indexOf(tag.tagName) == -1) {
        tagsarray.push(tag.tagName);
      }
    }
  }
  return tagsarray;
}

interface Promptoptions {
  name: string;
  value: string;
}
