import schema from "./schema.json" assert { type: "json" };

import Ajv, { ErrorObject } from "https://esm.sh/ajv@8.11.0";
import addFormats from "https://esm.sh/ajv-formats@2.1.0";
import {
  FoundationConfig,
  FoundationFrontmatter,
} from "../FoundationConfig.ts";
import { PlatformConfig } from "../PlatformConfig.ts";
import { MeshError } from "../../errors.ts";
import { Logger } from "../../cli/Logger.ts";
import { KitModule } from "../../kit/KitModule.ts";
import { ComplianceControl } from "../../compliance/ComplianceControl.ts";

export class ModelValidator {
  private readonly ajv: Ajv;
  constructor(private readonly logger: Logger) {
    this.ajv = new Ajv({ allErrors: true });

    // something's wrong about the typings here
    // deno-lint-ignore no-explicit-any
    addFormats(this.ajv as any);

    this.ajv.addSchema(schema);
  }

  // Design: maybe we should have frontmatter definitions all live inside the model package?
  //

  public validateFoundationConfig(data: Partial<FoundationConfig>) {
    return this.validate("FoundationConfig", data);
  }

  public validateFoundationFrontmatter(data: Partial<FoundationFrontmatter>) {
    return this.validate("FoundationFrontmatter", data);
  }

  public validatePlatformConfig(data: Partial<PlatformConfig>) {
    const result = this.validate("PlatformConfig", data);

    // unforuntately AJV gives us errors for all branches of the oneOf
    // not just the one that has been selected. So we try to remove those misleading errors here
    const errorsWithoutIrrelevantOneOfBranches = result.errors?.filter(
      (x) => !(x.instancePath === "" && x.keyword === "required"),
    );

    return { data: result.data, errors: errorsWithoutIrrelevantOneOfBranches };
  }

  public validateKitModule(data: Partial<KitModule>) {
    return this.validate("KitModule", data);
  }

  public validateComplianceControl(data: Partial<ComplianceControl>) {
    return this.validate("ComplianceControl", data);
  }

  private validate<T>(type: string, data: Partial<T>) {
    const validate = this.getSchema(type);

    if (!validate(data)) {
      // Ajv typings don't support this
      // deno-lint-ignore no-extra-non-null-assertion
      const errors = validate.errors!!;
      this.logger.debug(
        () =>
          `Failed to validate object of type "${type}".\nObject: ${
            JSON.stringify(
              data,
              null,
              2,
            )
          }\nErrors: ${JSON.stringify(errors, null, 2)}`,
      );
      return { data, errors };
    }

    return { data: data as T };
  }

  private getSchema(type: string) {
    const schema = this.ajv.getSchema("#/definitions/" + type);

    if (!schema) {
      throw new Error("Did not find schema " + type);
    }

    return schema;
  }
}

export class CollieModelValidationError extends MeshError {
  constructor(message: string, errors: ErrorObject[]) {
    const formattedErrors = [
      message,
      ...errors.map(
        (x) => `\t- "${x.instancePath.replaceAll("/", ".")}" ${x.message}`,
      ),
    ].join("\n");

    super(formattedErrors);
  }
}

export class CollieFoundationDoesNotExistError extends MeshError {}
export class ColliePlatformDoesNotExistError extends MeshError {}
