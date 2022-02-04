import { Input } from "../../deps.ts";
import { CmdGlobalOptions } from "../cmd-options.ts";
import { dateRegex } from "../custom-types.ts";

export async function interactiveDate(
  _options: CmdGlobalOptions,
  question: string,
) {
  let running = true;
  let date = "";
  while (running) {
    date = await Input.prompt(question);
    if (!dateRegex.test(date.toLowerCase())) {
      console.log("Please enter a valid date in format YYYY-MM-DD.");
    } else {
      running = false;
    }
  }
  return date;
}
