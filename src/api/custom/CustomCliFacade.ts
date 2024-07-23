 import { ProcessResultWithOutput } from "../../process/ProcessRunnerResult.ts";
 import { IProcessRunner } from "../../process/IProcessRunner.ts";

 export class CustomCliFacade {
   constructor(
     private readonly processRunner: IProcessRunner<ProcessResultWithOutput>,
   ) {}

 }
 