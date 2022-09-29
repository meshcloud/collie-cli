import { FLAGS } from "./src/info.ts";
import { isWindows } from "./src/os.ts";

let __dirname = new URL(".", import.meta.url).pathname;
if (isWindows) {
  __dirname = __dirname.substring(1); // on windows we have to strip the path so it looks like C:/... instead of /C:/...
}

console.log(FLAGS + ` --import-map=${__dirname}src/import_map.json`);
