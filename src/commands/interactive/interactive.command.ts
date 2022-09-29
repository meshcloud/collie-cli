import { exploreInteractive } from "./untagged-tenants.ts";
import { listTenantAction } from "../tenant/list.command.ts";
import { listTenantsCostAction } from "../tenant/cost.command.ts";
import { Select } from "../../deps.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { interactiveDate } from "./inputInteractiveDate.ts";
import { CLI } from "../../info.ts";
import { GlobalCommandOptions } from "../GlobalCommandOptions.ts";
import { CollieRepository } from "../../model/CollieRepository.ts";
import { InteractivePrompts } from "./InteractivePrompts.ts";
import { prepareTenantCommand } from "../tenant/prepareTenantCommand.ts";
import { detailViewTenant } from "./detailViewTenant.ts";
import { TopLevelCommand } from "../TopLevelCommand.ts";
import { isWindows } from "../../os.ts";

export function registerInteractiveCommand(program: TopLevelCommand) {
  program
    .command("interactive")
    .description(
      `Experimental interactive mode to explore your cloud foundations`,
    )
    .action(startInteractiveMode);
}

export async function startInteractiveMode(options: GlobalCommandOptions) {
  console.clear();
  const interactivehelp =
    `\n\n\nWelcome to ${CLI} interactive mode. This experimental mode allows you to herd your tenants in a quicker, more interactive way.\n\n\n "LIST ALL TENANTS"\nis equivalent to "${CLI} tenant list"\n\n"LIST ALL TENANTS WITH COST"\nis equivalent to "${CLI} tenant costs"\n\n"EXPLORE TENANTS WITH MISSING TAGS"\nis the superpower of the interactive mode. Go check it out!\n\n`;

  const collie = await CollieRepository.load();

  const foundation = await InteractivePrompts.selectFoundation(collie);

  let running = true;
  while (running) {
    const action: string = await Select.prompt({
      message: "Select what you want to do",
      options: [
        { name: "LIST ALL TENANTS", value: "alltenants" },
        { name: "SEARCH TENANT", value: "searchtenant" },
        { name: "LIST ALL TENANTS WITH COST", value: "tenantcost" },
        { name: "EXPLORE TENANTS WITH MISSING TAGS", value: "exploremissing" },
        { name: "HELP", value: "help" },
        { name: "QUIT", value: "quit" },
      ],
    });

    switch (action) {
      case "alltenants": {
        console.clear();
        await listTenantAction({
          ...options,
          refresh: false,
          output: OutputFormat.TABLE,
        }, foundation);
        break;
      }
      case "searchtenant": {
        console.clear();
        const { meshAdapter } = await prepareTenantCommand(
          { ...options, refresh: false },
          foundation,
        );

        const tenants = await meshAdapter.getMeshTenants();

        const tenantId = await Select.prompt({
          message: "select a tenant",
          options: tenants.map((x) => ({
            value: x.platformTenantId,
            name:
              `${x.platformTenantName} (${x.platformId} ${x.platformTenantId})`,
          })),
          search: !isWindows, // see https://github.com/c4spar/deno-cliffy/issues/272#issuecomment-1262197264
          info: true,
        });

        await detailViewTenant(meshAdapter, tenants, tenantId, false);

        break;
      }
      case "tenantcost": {
        console.clear();
        const from = await interactiveDate("Start date?");
        if (from == "BACK") {
          break;
        }
        const to = await interactiveDate("End date?");
        if (to == "BACK") {
          break;
        }
        if (from && to) {
          const params = {
            from: from,
            to: to,
            debug: options.debug,
            verbose: options.verbose,
            output: OutputFormat.TABLE,
          };
          await listTenantsCostAction(
            { ...options, ...params, refresh: false },
            foundation,
          );
        }
        break;
      }
      case "exploremissing": {
        await exploreInteractive(options, foundation);
        break;
      }
      case "help": {
        console.clear();
        console.log(interactivehelp);
        break;
      }
      case "quit": {
        running = false;
        console.log("Closing interactive Mode.");
        Deno.exit();
        break;
      }
      default: {
        throw new Error("Invalid value. Something went horribly wrong.");
      }
    }
  }
}
