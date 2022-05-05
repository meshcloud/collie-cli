export interface KitModuleComplianceStatement {
  /**
   * Description of the control
   */
  control: string;

  /**
   * Description of how the kit module complies with that control, e.g. description of a technical measure.
   */
  statement: string;
}
