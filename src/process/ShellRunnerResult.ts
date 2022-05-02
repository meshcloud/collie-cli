export interface ProcessResult {
  status: Deno.ProcessStatus;
}

export interface ProcessResultWithOutput extends ProcessResult {
  stdout: string;
  stderr: string;
}

export type ShellRunnerResult = ProcessResult | ProcessResultWithOutput;
