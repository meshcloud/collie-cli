import { CmdGlobalOptions } from "../cmd-options.ts";
import { exploreInteractive } from "./untagged-tenants.ts";
import { listTenantAction, listTenantsCostAction } from "../tenant.command.ts";
import { Select } from "../../deps.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { interactiveDate } from "./inputInteractiveDate.ts";

export async function startInteractiveMode(options: CmdGlobalOptions) {
  console.clear();
  const interactivehelp =
    '\n\n\nWelcome to the collie-cli interactive mode. This mode allows you to herd your tenants in a quicker, more userfriendly way.\n\n\n "LIST ALL TENANTS"\nis equivalent to "collie tenant list"\n\n"LIST ALL TENANTS WITH COST"\nis equivalent to "collie tenant costs"\n\n"EXPLORE TENANTS WITH MISSING TAGS"\nis the superpower of the interactive mode. Go check it out!\n\n';

  let running = true;
  while (running) {
    const action: string = await Select.prompt({
      message: "Select what you want to do",
      options: [
        { name: "LIST ALL TENANTS", value: "alltenants" },
        { name: "LIST ALL TENANTS WITH COST", value: "tenantcost" },
        { name: "EXPLORE TENANTS WITH MISSING TAGS", value: "exploremissing" },
        { name: "HELP", value: "help" },
        { name: "QUIT", value: "quit" },
      ],
    });

    switch (action) {
      case "alltenants": {
        console.clear();
        await listTenantAction(options);
        break;
      }
      case "tenantcost": {
        console.clear();
        const from = await interactiveDate(options, "Startdate?");
        if (from == "BACK") {
          break;
        }
        const to = await interactiveDate(options, "Enddate?");
        if (to == "BACK") {
          break;
        }
        if (from != undefined && to != undefined) {
          const params = {
            from: from,
            to: to,
            debug: options.debug,
            verbose: options.verbose,
            output: OutputFormat.TABLE,
          };
          await listTenantsCostAction(params);
        }
        break;
      }
      case "exploremissing": {
        await exploreInteractive(options);
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
