import { Command } from "../deps.ts";
import { setupLogger } from "../logger.ts";
import { CmdGlobalOptions, OutputFormatType } from "./cmd-options.ts";
import { CLICommand, loadConfig } from "../config/config.model.ts";
import { verifyCliAvailability } from "../init.ts";
import { AwsShellRunnerFactory } from "../aws/aws-shell-runner-factory.ts";
import { AwsCliFacade } from "../aws/aws-cli-facade.ts";
import { AwsRoleAssumer } from "../aws/aws-role-assumer.ts";
import { MeshError } from "../errors.ts";

interface ExecuteAwsCmdOptions extends CmdGlobalOptions {
  account: string;
  role?: string;
}

interface DeleteUserCmdOptions extends CmdGlobalOptions {
  account?: string;
  role?: string;
}

export function registerAwsCommand(program: Command) {
  const awsCmd = new Command()
    .description(
      `Executes specialized AWS commands or helper functions.`,
    )
    .action(() => {
      awsCmd.showHelp();
    });
  program.command("aws", awsCmd);

  const executeCommandInTargetRoleCmd = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .description(
      "Executes the given AWS command with an assumed role. Saves you from using the CLI to switch roles.",
    )
    .option(
      "-r --role [accessRole:string]",
      "The role to assume before executing the command.\nIf not provided is uses the configured AWS access role",
    )
    .option(
      "-a, --account <account:string>",
      "Account ID where to execute the command",
      { required: true },
    )
    .example(
      "In order to list all users in the target account",
      `${CLICommand} aws exec iam list-users -a 123456789 -ar OrganizationAccountAccessRole`,
    )
    .example(
      "To provide arguments to the aws CLI you must put it in quotes",
      `${CLICommand} aws exec \"iam list-users --starting-token ABCDEF\" -a 123456789 -ar OrganizationAccountAccessRole`,
    )
    .action(executeCommandInTargetRoleAction);

  awsCmd
    .command("exec [...command:string]", executeCommandInTargetRoleCmd);

  const deleteUserCmd = new Command()
    // type must be added on every level that uses this type. Maybe bug in Cliffy?
    .type("output", OutputFormatType)
    .description(
      "Deletes the specified user with the recommended CLI strategy. See: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_manage.html",
    )
    // can this be dependent of account?
    .option(
      "-r --role [accessRole:string]",
      "The role to assume before executing the command.\nIf not provided is uses the configured AWS access role",
    )
    .option(
      "-a, --account <account:string>",
      "If specified the command tries to assume the (optionally) specified access role in this account first",
    )
    .example(
      "In order delete a user:",
      `${CLICommand} aws user-delete USERNAME`,
    )
    .example(
      "To provide arguments to the aws CLI you must put it in quotes",
      `${CLICommand} aws exec \"iam list-users --starting-token ABCDEF\" -a 123456789 -ar OrganizationAccountAccessRole`,
    )
    .action(deleteAwsUserAction);

  awsCmd
    .command("delete-user <username:string>", deleteUserCmd);
}

async function deleteAwsUserAction(
  options: DeleteUserCmdOptions,
  username: string,
) {
  setupLogger(options);

  const config = loadConfig();
  const awsShellRunnerFactory = new AwsShellRunnerFactory(config);
  const awsShellRunner = awsShellRunnerFactory.buildShellRunner(options);
  const awsFacade = new AwsCliFacade(awsShellRunner);

  let credentials;
  if (options.account) {
    const accessRole = options.role || config.aws.accountAccessRole;
    if (!accessRole) {
      throw new MeshError(
        `No access role was specified nor was one configured. Please run '${CLICommand} configure aws'`,
      );
    }

    const awsRoleAssumer = new AwsRoleAssumer(awsFacade);
    credentials = await awsRoleAssumer.assumeRole(
      options.account,
      accessRole,
    );
  }

  console.log(`Deleting user: ${username}`);

  console.log("Deleting user login profiles...");
  await awsFacade.deleteLoginProfile(username, credentials);

  console.log("Deleting user access keys...");
  const accessKeys = await awsFacade.listAccessKeys(username, credentials);
  await awsFacade.deleteAccessKeys(accessKeys, credentials);

  console.log("Deleting user sign certificates...");
  const certs = await awsFacade.listSigningCertificates(username, credentials);
  awsFacade.deleteSigningCertificates(certs, credentials);

  console.log("Deleting user ssh keys...");
  const sshKeys = await awsFacade.listSshPublicKeys(username, credentials);
  await awsFacade.deleteSshPublicKeys(sshKeys, credentials);

  console.log("Deleting user service credentials...");
  const serviceCreds = await awsFacade.listServiceSpecificCredentials(
    username,
    credentials,
  );
  await awsFacade.deleteServiceSpecificCredentials(serviceCreds, credentials);

  console.log("Deactivating user multi factor auth devices...");
  const mfaDevices = await awsFacade.listMfaDevices(username, credentials);
  await awsFacade.deactivateMfaDevices(mfaDevices, credentials);

  console.log("Deleting user multi factor auth devices...");
  await awsFacade.deleteMfaDevices(mfaDevices, credentials);

  console.log("Deleting user inline policies...");
  const userInlinePolicies = await awsFacade.listUserInlinePolicies(
    username,
    credentials,
  );
  await awsFacade.deleteUserInlinePolicies(
    username,
    userInlinePolicies,
    credentials,
  );

  console.log("Detaching user policies...");
  const userAttachedPolicies = await awsFacade.listUserAttachedPolicies(
    username,
    credentials,
  );
  await awsFacade.detachUserPolicies(
    username,
    userAttachedPolicies,
    credentials,
  );

  console.log("Removing user from groups...");
  const groupsOfUser = await awsFacade.listGroupsOfUser(username, credentials);
  await awsFacade.removeUserFromGroups(username, groupsOfUser, credentials);

  console.log("Deleting user...");
  await awsFacade.deleteUser(username, credentials);
}

async function executeCommandInTargetRoleAction(
  options: ExecuteAwsCmdOptions,
  command: string[],
) {
  setupLogger(options);
  await verifyCliAvailability();

  // Cliffy seperates it as single arguments.
  const joinedCmd = command.join(" ");

  const config = loadConfig();
  const awsShellRunnerFactory = new AwsShellRunnerFactory(config);
  const awsShellRunner = awsShellRunnerFactory.buildShellRunner(options);
  const awsFacade = new AwsCliFacade(awsShellRunner);
  const awsRoleAssumer = new AwsRoleAssumer(awsFacade);

  const accessRole = options.role || config.aws.accountAccessRole;
  if (!accessRole) {
    throw new MeshError(
      `No access role was specified nor was one configured. Please run '${CLICommand} configure aws'`,
    );
  }

  const credentials = await awsRoleAssumer.tryAssumeRole(
    options.account,
    accessRole,
  );

  if (credentials == null) {
    return;
  }

  const result = await awsShellRunner.run(`aws ${joinedCmd}`, credentials);

  if (result.code === 0) {
    console.log(result.stdout);
  } else {
    console.error(result.stderr);
  }
}
