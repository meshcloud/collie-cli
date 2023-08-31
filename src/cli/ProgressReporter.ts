import * as colors from "std/fmt/colors";
import { Logger } from "./Logger.ts";

export class ProgressReporter {
  private readonly start = performance.now();

  constructor(
    private readonly verb: string,
    private readonly id: string,
    private readonly logger: Logger,
  ) {
    this.reportProgress("...");
  }

  done() {
    const end = performance.now();
    const elapsed = end - this.start;

    const info = "DONE " + colors.gray(elapsed.toFixed(0) + "ms");
    this.reportProgress(info);
  }

  failed() {
    const end = performance.now();
    const elapsed = end - this.start;

    const info = colors.bgRed(colors.white("FAILED")) +
      " " +
      colors.gray(elapsed.toFixed(0) + "ms");

    this.reportProgress(info);
  }

  private reportProgress(info: string) {
    const msg = `${this.verb} ${this.id} ${info}`;
    this.logger.progress(msg);
  }
}
