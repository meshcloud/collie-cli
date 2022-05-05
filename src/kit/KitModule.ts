import { KitModuleComplianceStatement } from "./KitModuleComplianceStatement.ts";

export interface KitModule {
  name: string;
  summary: string;
  compliance?: KitModuleComplianceStatement[];
}
