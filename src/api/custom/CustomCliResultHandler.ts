import {
   CustomErrorCode,
   MeshCustomPlatformError,
   MeshInvalidTagValueError,
   MeshNotLoggedInError,
   ProcessRunnerError,
 } from "/errors.ts";
 import { CLI } from "/info.ts";
 import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
 import { ProcessRunnerResultHandler } from "../../process/ProcessRunnerResultHandler.ts";
 import { ProcessRunnerOptions } from "../../process/ProcessRunnerOptions.ts";
 import { CliDetector } from "../CliDetector.ts";
 
 export class CustomCliResultHandler implements ProcessRunnerResultHandler {
   private readonly errRegexInvalidTagValue =
     /An error occurred \(InvalidInputException\) when calling the TagResource operation: You provided a value that does not match the required pattern/;
 
   constructor(private readonly detector: CliDetector) {}
 
   async handleError(
     command: string[],
     options: ProcessRunnerOptions,
     error: Error,
   ): Promise<never> {
     // catch all error handling - try checking if its a cli version issue
     await this.detector.tryRaiseInstallationStatusError();
 
     throw new ProcessRunnerError(command, options, error);
   }
 
   async handleResult(
     command: string[],
     options: ProcessRunnerOptions,
     result: ProcessResultWithOutput,
   ): Promise<void> {
     switch (result.status.code) {
       case 0:
         return;
       case 253:
         throw new MeshNotLoggedInError(
           `You are not correctly logged into Custom CLI. Please verify credentials with "custom config" or disconnect with "${CLI} config --disconnect custom"\n${result.stderr}`,
         );
       case 254:
         if (result.stderr.match(this.errRegexInvalidTagValue)) {
           throw new MeshInvalidTagValueError(
             "You provided an invalid tag value for custom. Please try again with a different value.",
           );
         } else {
           throw new MeshCustomPlatformError(
             CustomErrorCode.CUSTOM_UNAUTHORIZED,
             `Access to required custom API calls is not permitted. You must use ${CLI} from a custom management account user.\n${result.stderr}`,
           );
         }
     }
     // catch all error handling - try checking if its a cli version issue
     await this.detector.tryRaiseInstallationStatusError();
 
     throw new ProcessRunnerError(command, options, result);
   }
 }
 