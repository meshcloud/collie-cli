import * as colors from "std/fmt/colors";
import { Logger } from "./Logger.ts";

export class ProgressReporter {
  private readonly start = performance.now();

  constructor(
    private readonly verb: string,
    private readonly id: string,
    private readonly logger: Logger,
  ) {
    this.reportProgress();
  }

  done() {
    const end = performance.now();
    const elapsed = end - this.start;

    this.reportProgress(elapsed);
  }

  private reportProgress(elapsedMs?: number) {
    const info = elapsedMs
      ? "DONE " + colors.gray(elapsedMs.toFixed(0) + "ms")
      : "...";
    const msg = `${this.verb} ${this.id} ${info}`;
    this.logger.progress(msg);
  }
}
