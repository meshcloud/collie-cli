import { SelectValueOptions } from "x/cliffy/prompt";

export type InputParameter = InputPromptParameter | InputSelectParameter;

export interface InputPromptParameter {
  description: string;
  validationRegex: RegExp;
  hint: string | undefined;
  validationFailureMessage: string;
}

export interface InputSelectParameter {
  description: string;
  hint: string | undefined;
  options: SelectValueOptions;
}
