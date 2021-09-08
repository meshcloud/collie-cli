import { ShellRunner } from "../process/shell-runner.ts";
import {
  AccessKey,
  AccessKeyResponse,
  Account,
  AccountResponse,
  AssumedRoleResponse,
  AttachedPolicy,
  AttachedPolicyResponse,
  Certificate,
  CertificateResponse,
  CostResponse,
  Credentials,
  Group,
  GroupResponse,
  InlinePolicyResponse,
  MFADevice,
  MFADevicesResponse,
  ServiceSpecificCredential,
  ServiceSpecificCredentialsResponse,
  SSHPublicKey,
  SSHPublicKeysResponse,
  Tag,
  TagResponse,
  User,
  UserResponse,
} from "./aws.model.ts";
import { ShellOutput } from "../process/shell-output.ts";
import { moment } from "../deps.ts";
import {
  AwsErrorCode,
  MeshAwsPlatformError,
  MeshNotLoggedInError,
} from "../errors.ts";
import { sleep } from "../promises.ts";
import { CLICommand, CLIName } from "../config/config.model.ts";
import { parseJsonWithLog } from "../json.ts";

export class AwsCliFacade {
  constructor(
    private readonly shellRunner: ShellRunner,
  ) {}

  private async fetchPagedWithMarker<T extends { Marker?: string }, R>(
    command: string,
    extractionFn: (response: T) => R[],
    credential?: Credentials,
  ): Promise<R[]> {
    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);

    let response = parseJsonWithLog<T>(result.stdout);
    const data = extractionFn(response);

    while (response.Marker) {
      const pagedCommand = `${command} --starting-token ${response.Marker}`;
      const result = await this.shellRunner.run(pagedCommand, credential);
      this.checkForErrors(result);

      response = parseJsonWithLog<T>(result.stdout);

      data.push(...extractionFn(response));
    }

    return data;
  }

  private async fetchPagedWithNextToken<T extends { NextToken?: string }, R>(
    command: string,
    extractionFn: (response: T) => R[],
    credential?: Credentials,
  ): Promise<R[]> {
    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);

    let response = parseJsonWithLog<T>(result.stdout);
    const data = extractionFn(response);

    while (response.NextToken) {
      const pagedCommand = `${command} --starting-token ${response.NextToken}`;
      const result = await this.shellRunner.run(pagedCommand, credential);
      this.checkForErrors(result);

      response = parseJsonWithLog<T>(result.stdout);

      data.push(...extractionFn(response));
    }

    return data;
  }

  listAccessKeys(
    username: string,
    credential?: Credentials,
  ): Promise<AccessKey[]> {
    const command =
      `aws iam list-access-keys --user-name ${username} --max-items 50`;

    return this.fetchPagedWithMarker<AccessKeyResponse, AccessKey>(
      command,
      (x) => x.AccessKeyMetadata,
      credential,
    );
  }

  async deleteLoginProfile(
    username: string,
    credential?: Credentials,
  ) {
    const command = `aws iam delete-login-profile --user-name ${username}`;
    const result = await this.shellRunner.run(command, credential);
    try {
      this.checkForErrors(result);
    } catch (e) {
      if (
        MeshAwsPlatformError.isInstanceWithErrorCode(
          e,
          AwsErrorCode.AWS_NO_SUCH_ENTITY,
        )
      ) {
        // can happen if the entity was already deleted. This is fine.
        return;
      }

      throw e;
    }
  }

  async deleteAccessKeys(
    accessKeys: AccessKey[],
    credential?: Credentials,
  ) {
    for (const accessKey of accessKeys) {
      const command =
        `aws iam delete-access-key --access-key-id ${accessKey.AccessKeyId} --user-name ${accessKey.UserName}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  listSigningCertificates(
    username: string,
    credential?: Credentials,
  ): Promise<Certificate[]> {
    const command =
      `aws iam list-signing-certificates --user-name ${username}  --max-items 50`;

    return this.fetchPagedWithMarker<CertificateResponse, Certificate>(
      command,
      (x) => x.Certificates,
      credential,
    );
  }

  async deleteSigningCertificates(
    certificates: Certificate[],
    credential?: Credentials,
  ) {
    for (const cert of certificates) {
      const command =
        `aws iam delete-signing-certificate --certificate-id ${cert.CertificateId} --user-name ${cert.UserName}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async listSshPublicKeys(
    username: string,
    credential?: Credentials,
  ): Promise<SSHPublicKey[]> {
    const command =
      `aws iam list-ssh-public-keys --user-name ${username} --max-items 50`;

    return await this.fetchPagedWithMarker<SSHPublicKeysResponse, SSHPublicKey>(
      command,
      (x) => x.SSHPublicKeys,
      credential,
    );
  }

  async deleteSshPublicKeys(
    sshPublicKey: SSHPublicKey[],
    credential?: Credentials,
  ) {
    for (const key of sshPublicKey) {
      const command =
        `aws iam delete-ssh-public-key --user-name ${key.UserName} --ssh-public-key-id ${key.SSHPublicKeyId}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async listServiceSpecificCredentials(
    username: string,
    credential?: Credentials,
  ): Promise<ServiceSpecificCredential[]> {
    const command =
      `aws iam list-service-specific-credentials --user-name ${username}`;

    return await this.fetchPagedWithMarker<
      ServiceSpecificCredentialsResponse,
      ServiceSpecificCredential
    >(
      command,
      (x) => x.ServiceSpecificCredentials,
      credential,
    );
  }

  async deleteServiceSpecificCredentials(
    serviceCredentials: ServiceSpecificCredential[],
    credential?: Credentials,
  ) {
    for (const serviceCred of serviceCredentials) {
      const command =
        `aws iam delete-service-specific-credential --user-name ${serviceCred.UserName} --service-specific-credential-id ${serviceCred.ServiceSpecificCredentialId}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async listMfaDevices(
    username: string,
    credential?: Credentials,
  ): Promise<MFADevice[]> {
    const command =
      `aws iam list-mfa-devices --user-name ${username} --max-items 50`;

    return await this.fetchPagedWithMarker<
      MFADevicesResponse,
      MFADevice
    >(
      command,
      (x) => x.MFADevices,
      credential,
    );
  }

  async deactivateMfaDevices(
    mfaDevices: MFADevice[],
    credential?: Credentials,
  ) {
    for (const mfsDevice of mfaDevices) {
      const command =
        `aws iam deactivate-mfa-device --user-name ${mfsDevice.UserName} --serial-number ${mfsDevice.SerialNumber} `;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async deleteMfaDevices(
    mfaDevices: MFADevice[],
    credential?: Credentials,
  ) {
    for (const mfsDevice of mfaDevices) {
      const command =
        `aws iam delete-virtual-mfa-device --serial-number ${mfsDevice.SerialNumber} `;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async listUserInlinePolicies(
    username: string,
    credential?: Credentials,
  ): Promise<string[]> {
    const command =
      `aws iam list-user-policies --user-name ${username} --max-items 50`;

    return await this.fetchPagedWithMarker<
      InlinePolicyResponse,
      string
    >(
      command,
      (x) => x.PolicyNames,
      credential,
    );
  }

  async deleteUserInlinePolicies(
    username: string,
    inlinePolicies: string[],
    credential?: Credentials,
  ) {
    for (const policy of inlinePolicies) {
      const command =
        `aws iam delete-user-policy --user-name ${username} --policy-name ${policy}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async listUserAttachedPolicies(
    username: string,
    credential?: Credentials,
  ): Promise<AttachedPolicy[]> {
    const command =
      `aws iam list-attached-user-policies --user-name ${username}  --max-items 50`;

    return await this.fetchPagedWithMarker<
      AttachedPolicyResponse,
      AttachedPolicy
    >(
      command,
      (x) => x.AttachedPolicies,
      credential,
    );
  }

  async detachUserPolicies(
    username: string,
    policies: AttachedPolicy[],
    credential?: Credentials,
  ) {
    for (const policy of policies) {
      const command =
        `aws iam detach-user-policy --user-name ${username} --policy-arn ${policy.PolicyArn}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async listGroupsOfUser(
    username: string,
    credential?: Credentials,
  ): Promise<Group[]> {
    const command =
      `aws iam list-groups-for-user --user-name ${username} --max-items 50`;

    return await this.fetchPagedWithNextToken<GroupResponse, Group>(
      command,
      (x) => x.Groups,
      credential,
    );
  }

  async removeUserFromGroups(
    username: string,
    groups: Group[],
    credential?: Credentials,
  ) {
    for (const group of groups) {
      const command =
        `aws iam remove-user-from-group --group-name ${group.GroupName} --user-name ${username}`;
      const result = await this.shellRunner.run(command, credential);
      this.checkForErrors(result);
    }
  }

  async deleteUser(
    username: string,
    credential?: Credentials,
  ) {
    const command = `aws iam delete-user --user-name ${username}`;
    const result = await this.shellRunner.run(command, credential);
    this.checkForErrors(result);
  }

  async listAccounts(): Promise<Account[]> {
    let nextToken = null;
    let accounts: Account[] = [];
    do {
      let command = "aws organizations list-accounts --output json";
      if (nextToken != null) {
        command += ` --starting-token ${nextToken}`;
      }

      const result = await this.shellRunner.run(command);
      this.checkForErrors(result);

      console.debug(`listAccounts: ${JSON.stringify(result)}`);

      const jsonResult = parseJsonWithLog<AccountResponse>(result.stdout);
      nextToken = jsonResult.NextToken;
      accounts = accounts.concat(jsonResult.Accounts);
    } while (nextToken != null);

    return accounts;
  }

  async listTags(account: Account): Promise<Tag[]> {
    const command =
      `aws organizations list-tags-for-resource --resource-id ${account.Id}`;

    const result = await this.shellRunner.run(command);
    this.checkForErrors(result);

    console.debug(`listTags: ${JSON.stringify(result)}`);

    if (result.code === 254) {
      console.debug("AWS is overheated. We wait one second and continue.");
      await sleep(1000);

      return await this.listTags(account);
    }

    return parseJsonWithLog<TagResponse>(result.stdout).Tags;
  }

  async assumeRole(
    roleArn: string,
    credentials?: Credentials,
  ): Promise<Credentials> {
    const command =
      `aws sts assume-role --role-arn ${roleArn} --role-session-name Collie-Session`;

    const result = await this.shellRunner.run(command, credentials);
    this.checkForErrors(result);

    console.debug(`assumeRole: ${JSON.stringify(result)}`);

    return parseJsonWithLog<AssumedRoleResponse>(result.stdout).Credentials;
  }

  async listUsers(credential: Credentials): Promise<User[]> {
    const command = `aws iam list-users --max-items 50`;

    return await this.fetchPagedWithNextToken<UserResponse, User>(
      command,
      (x) => x.Users,
      credential,
    );
  }

  async listGroups(credential: Credentials): Promise<Group[]> {
    const command = `aws iam list-groups --max-items 50`;

    return await this.fetchPagedWithNextToken<GroupResponse, Group>(
      command,
      (x) => x.Groups,
      credential,
    );
  }

  async listUserOfGroup(
    group: Group,
    credential: Credentials,
  ): Promise<User[]> {
    const command =
      `aws iam get-group --group-name ${group.GroupName} --max-items 50`;

    return await this.fetchPagedWithNextToken<UserResponse, User>(
      command,
      (x) => x.Users,
      credential,
    );
  }

  async listAttachedGroupPolicies(
    group: Group,
    credential: Credentials,
  ): Promise<AttachedPolicy[]> {
    const command =
      `aws iam list-attached-group-policies --group-name ${group.GroupName}`;

    return await this.fetchPagedWithMarker<
      AttachedPolicyResponse,
      AttachedPolicy
    >(
      command,
      (x) => x.AttachedPolicies,
      credential,
    );
  }

  /**
   * https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
   *
   * Note: the actual paging handling has not been tested but has been built by using [listAccounts]' logic and AWS docs.
   */
  async listCosts(startDate: Date, endDate: Date): Promise<CostResponse> {
    let result: CostResponse | null = null;
    let nextToken = null;
    const format = "YYYY-MM-DD";
    const start = moment(startDate).format(format);
    const end = moment(endDate).format(format);

    do {
      let command =
        `aws ce get-cost-and-usage --time-period Start=${start},End=${end} --granularity MONTHLY --metrics BLENDED_COST --group-by Type=DIMENSION,Key=LINKED_ACCOUNT`;
      if (nextToken != null) {
        command += ` --next-page-token=${nextToken}`;
      }

      const rawResult = await this.shellRunner.run(command);
      this.checkForErrors(rawResult);

      console.debug(`listCosts: ${JSON.stringify(rawResult)}`);

      const costResult = parseJsonWithLog<CostResponse>(rawResult.stdout);

      if (costResult.NextPageToken) {
        nextToken = costResult.NextPageToken;
      }
      // This is a bit hacky but we extend the original response with new data, rather than overwriting it.
      if (!result) {
        result = costResult;
      } else {
        result.ResultsByTime = result.ResultsByTime.concat(
          costResult.ResultsByTime,
        );
        // We do not concat the other values since (we assume) they do not change in-between requests.
      }
    } while (nextToken != null);

    return result;
  }

  private checkForErrors(result: ShellOutput) {
    switch (result.code) {
      case 0:
        return;
      case 253:
        throw new MeshNotLoggedInError(
          `You are not correctly logged into AWS CLI. Please verify credentials with "aws config" or disconnect with "${CLICommand} config --disconnect AWS"\n${result.stderr}`,
        );
      case 254:
        // This can happen for different reasons. Also when entities are not found so we need some additional checks to improve error message.
        if (result.stderr.includes("NoSuchEntity")) {
          // Actually AWS already has a pretty good error message.
          throw new MeshAwsPlatformError(
            AwsErrorCode.AWS_NO_SUCH_ENTITY,
            result.stderr.trim(),
          );
        } else {
          throw new MeshAwsPlatformError(
            AwsErrorCode.AWS_UNAUTHORIZED,
            `Access to required AWS API calls is not permitted. You must use ${CLIName} from a AWS management account user.\n${result.stderr.trim()}`,
          );
        }
      default:
        throw new MeshAwsPlatformError(
          AwsErrorCode.AWS_CLI_GENERAL,
          result.stderr,
        );
    }
  }
}
