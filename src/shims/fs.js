import commands from "../../modcheck/data/commands.json";
import vanilla from "../../modcheck/data/vanilla.json";

const tables = new Map([
  ["commands.json", commands],
  ["vanilla.json", vanilla],
]);

export function readFileSync(file) {
  const name = String(file).split("/").pop();
  const table = tables.get(name);
  if (table) return JSON.stringify(table);
  throw new Error(`fs shim: only the validator's data tables exist in the browser (asked for ${file})`);
}

export default { readFileSync };
