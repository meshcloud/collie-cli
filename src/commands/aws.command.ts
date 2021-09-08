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
}

async function deleteAwsUser() {
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
