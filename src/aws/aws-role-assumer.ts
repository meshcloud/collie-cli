import { AwsErrorCode, MeshAwsPlatformError } from "../errors.ts";
import { AwsCliFacade } from "./aws-cli-facade.ts";
import { Credentials } from "./aws.model.ts";

export class AwsRoleAssumer {
  constructor(
    private readonly awsCli: AwsCliFacade,
  ) {}

  tryAssumeRole(
    accountId: string,
    accessRole: string,
  ): Promise<Credentials | null> {
    // Detect if the user gave us a role arn or only a role name. If its only a role name
    // we assume the role lives in his current caller account and try to assume it with this
    // arn.
    const assumeRoleArn = `arn:aws:iam::${accountId}:role/${accessRole}`;
    // Assume the role to execute the following commands from the account context.
    // This can fail if the role to assume does not exist in the target account.
    return this.execAssumeRole(assumeRoleArn);
  }

  private async execAssumeRole(
    assumeRoleArn: string,
  ): Promise<Credentials | null> {
    try {
      return await this.awsCli.assumeRole(assumeRoleArn);
    } catch (e) {
      if (
        MeshAwsPlatformError.isInstanceWithErrorCode(
          e,
          AwsErrorCode.AWS_UNAUTHORIZED,
        )
      ) {
        console.error(
          `Could not assume role ${assumeRoleArn}. It probably does not exist in the target account`,
        );

        return Promise.resolve(null);
      }

      throw e;
    }
  }
}
