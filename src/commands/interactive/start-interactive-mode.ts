import { CmdGlobalOptions } from "../cmd-options.ts";
import { exploreInteractive } from "./untagged-tenants.ts";
import { listTenantAction, listTenantsCostAction } from "../tenant.command.ts"
import { Input, Select } from "../../deps.ts";
import { OutputFormat } from "../../presentation/output-format.ts";
import { interactiveDate } from "./inputInteractiveDate.ts";

export async function startInteractiveMode(options: CmdGlobalOptions){
  console.clear();  
  let running:boolean;
    running = true;
    while (running)  {
      const interactivehelp = "Do some help.";
  
      const action: string = await Select.prompt({
        message: "Select what you want to do",
        options: [
          { name: "LIST ALL TENANTS", value: "alltenants"},
          { name: "LIST ALL TENANTS WITH COST", value: "tenantcost" },
          { name: "EXPLORE TENANTS WITH MISSING TAGS", value:"exploremissing"},
          { name: "HELP", value: "help" },
          { name: "QUIT", value: "quit" },
        ],
      });
  
      switch(action) {
        case "alltenants": {
          console.clear();
          await listTenantAction(options);
          break;
  
        }
        case "tenantcost": {
          console.clear();
          const form = await interactiveDate(options, "Startdate?");
          const to = await interactiveDate(options, "Enddate?");
          const params = {
            from:form,
            to:to,
            debug: options.debug,
            verbose: options.verbose,
            output: OutputFormat.TABLE,
          }
          await listTenantsCostAction(params);
          break;
        }
        case "exploremissing": {
          await exploreInteractive(options);
          break;
        }
        case "help": {
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
          throw new Error('Invalid value. Something went horribly wrong.')
        }
      }
    }
    
  }
