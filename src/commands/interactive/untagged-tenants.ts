import { loadConfig } from "../../config/config.model.ts";
import { moment, Select } from "../../deps.ts";
import { verifyCliAvailability } from "../../init.ts";
import { setupLogger } from "../../logger.ts";
import { MeshAdapterFactory } from "../../mesh/mesh-adapter.factory.ts";
import { QueryStatistics } from "../../mesh/query-statistics.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { MeshError } from "../../errors.ts";
import { sortTenantData } from "./sortTenantData.ts";
import { MeshTenant } from "../../mesh/mesh-tenant.model.ts";
import { detailViewTenant } from "./detailViewTenant.ts";
import { interactiveDate } from "./inputInteractiveDate.ts";


 export async function exploreInteractive(options: CmdGlobalOptions){
    const help = "do some help.";
    let running:boolean;
    console.clear();


    running = true;
    while(running) {
        const action: string = await Select.prompt({
            message: "Select what you want to do",
            options: [
              { name: "SORT BY HIGHEST COST", value: "sortbycost"},
              { name: "DO NOT SORT BY HIGHEST COST", value: "unsorted" },
              { name: "HELP", value: "help" },
              { name: "BACK", value: "back" },
              { name: "QUIT", value: "quit" },
            ],
          });
      
          switch(action) {
            case "sortbycost": {

              const startDate = await interactiveDate(options, "Startdate");
              const endDate = await interactiveDate(options, "Enddate?")
              await showUntagged(options, await getData(options, startDate, endDate), startDate, endDate);
              break;
      
            }
            case "unsorted": {
              //await showUntagged(await getData(options));
              await showUntagged(options, await getData(options));
              break;
            }
            case "help": {
              console.log(help);
              break;
            }
            case "back": {
              running = false;
              break;
            }
            case "quit": {
                Deno.exit();
                break;
            }
            default: {
              throw new MeshError('Invalid value. Something went horribly wrong.')
            }
        }
    }

    
}




async function getData(options: CmdGlobalOptions, from: string|undefined = undefined, to:string|undefined = undefined){
  setupLogger(options);
  await verifyCliAvailability();

  if((from == undefined || "") && (to == undefined || "") ){

    const config = loadConfig();
    const meshAdapterFactory = new MeshAdapterFactory(config);
    const queryStatistics = new QueryStatistics();
    const meshAdapter = meshAdapterFactory.buildMeshAdapter(
      options,
      queryStatistics,
    );

    const allTenants = await meshAdapter.getMeshTenants();
    return allTenants;
    
  }else if(from != undefined){
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

async function showUntagged(options:CmdGlobalOptions, data: MeshTenant[], from: string|undefined = undefined, to:string|undefined = undefined) {
  
  console.clear();
  const tags = getAllTags(data);
  let running = true;


  if((from != undefined) && (to != undefined)){
    
    data = sortTenantData(options, data);
  }

  while(running){
      const selectedTag = await selectTag(tags);
      if(selectedTag == "BACK") {
        running = false;
      }else {
      const untaggedTenant: Array<MeshTenant>|undefined = [];

      for(const tenant of data) {
        if(filterForTag(options, tenant, selectedTag) == false) {
          untaggedTenant.push(tenant);
        }
      }
      let runningInside = true;
      while(runningInside) {
        const selectedTenant = await selectTenant(untaggedTenant);
        if(selectedTenant == "BACK") {
          runningInside = false;
        }else {
          await detailViewTenant(options, data, selectedTenant, selectedTag, (from == undefined || to == undefined));
        }
      }
    }
  }
}



function filterForTag(_options:CmdGlobalOptions, tenant:MeshTenant, tagName:string){
  let result = false; 
  for(const tag of tenant.tags){
    if(tag.tagName == tagName){
      result = true;
    }
    
  }
  return result;
}


async function selectTag(tags:Array<string>, additionalOptions:Array<string>=[]){
  const options:Array<promptoptions> = [];

  for(const tag of tags){
    options.push({value: tag, name: tag});
  }
  for(const additionalOption of additionalOptions){
    options.push({value: additionalOption, name: additionalOption});
  }
  options.push({value: "HELP", name: "HELP"});
  options.push({value: "BACK", name: "BACK"});
  options.push({value: "QUIT", name: "QUIT"});
  const selection =  await Select.prompt({
    message: "Select a tag",
    options: options
  });
  if (selection == "QUIT"){
    Deno.exit();
  }
  return selection;
} 


async function selectTenant(tenants:Array<MeshTenant>, additionalOptions:Array<string>=[]){
  const options:Array<promptoptions> = [];
  for(const tenant of tenants){
    options.push({value: tenant.platformTenantId, name: tenant.platformTenantName});
  }
  for(const additionalOption of additionalOptions){
    options.push({value: additionalOption, name: additionalOption});
  }
  options.push({value: "HELP", name: "HELP"});
  options.push({value: "BACK", name: "BACK"});
  options.push({value: "QUIT", name: "QUIT"});
  const selection =  await Select.prompt({
    message: "Select a tenant",
    options: options
  });
  if (selection == "QUIT"){
    Deno.exit();
  }
  return selection;
}




function getAllTags(data: MeshTenant[]){
  const tagsarray:Array<string> = [];
  for(const tenant of data){
    for(const tag of tenant.tags){
      if(tagsarray.indexOf(tag.tagName) == -1){
        tagsarray.push(tag.tagName);
      }
       
    }
  }
  return tagsarray;
}




interface promptoptions{
  name: string;
  value: string;
}
