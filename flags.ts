import { FLAGS } from "./src/info.ts";

const __dirname = new URL(".", import.meta.url).pathname;

console.log(FLAGS + ` --import-map=${__dirname}src/import_map.json`);
