import { Logger } from "../cli/Logger.ts";
import { ComplianceControlParser } from "./ComplianceControlParser.ts";
import { ComplianceControl } from "./ComplianceControl.ts";
import { CollieRepository } from "../model/CollieRepository.ts";
import { ParsedComplianceControl } from "./ParsedComplianceControl.ts";
import { ModelValidator } from "../model/schemas/ModelValidator.ts";

export class ComplianceControlRepository {
  private readonly controlsById: Map<string, ComplianceControl>;

  constructor(private readonly controls: ParsedComplianceControl[]) {
    this.controlsById = new Map(controls.map((x) => [x.id, x.control]));
  }

  tryFindById(id: string) {
    return this.controlsById.get(id);
  }

  get all() {
    return this.controls;
  }

  public static async load(
    kit: CollieRepository,
    validator: ModelValidator,
    logger: Logger,
  ) {
    const parser = new ComplianceControlParser(kit, validator, logger);
    const controls = await parser.load();

    const parsedControls = controls.filter(
      (x): x is ParsedComplianceControl => !!x,
    );

    return new ComplianceControlRepository(parsedControls);
  }
}
