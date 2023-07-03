export interface ProcessResult {
  status: Deno.CommandStatus;
}

export interface ProcessResultWithOutput extends ProcessResult {
  stdout: string;
  stderr: string;
}

export type ProcessRunnerResult = ProcessResult | ProcessResultWithOutput;
