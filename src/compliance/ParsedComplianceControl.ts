import { ComplianceControl } from "./ComplianceControl.ts";

export interface ParsedComplianceControl {
  /**
   * The id of the compliance control is the relative path from the compliance/ directory to the markdown file describing the control (minus extension)
   */
  id: string;

  /**
   * The kit-relative path to the markdown document describing this control
   */
  definitionPath: string;

  /**
   * The compliance control
   */
  control: ComplianceControl;
}
