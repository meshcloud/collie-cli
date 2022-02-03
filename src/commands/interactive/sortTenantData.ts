import { MeshTenant } from "../../mesh/mesh-tenant.model.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";

export function sortTenantData(_options: CmdGlobalOptions, data: MeshTenant[]){
    
    
    data.sort(function(a:MeshTenant, b:MeshTenant){
        let costA = 0;
        let costB = 0;
        
        if(a != undefined){
            for(const cost of a.costs){
                if (cost.cost != undefined && cost.cost != ""){
                    costA += Number(cost.cost);
                }
            }
        }
        if(b != undefined){
            for(const cost of b.costs){
                if (cost.cost != undefined && cost.cost != ""){
                    costB += Number(cost.cost);
                }
            }
        }
        
        if(costA > costB){return -1;}
        else if (costB > costA){return 1;}
        

        return 0;
    });

    return data;
}
