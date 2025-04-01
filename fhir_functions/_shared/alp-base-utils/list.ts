import { $ } from "npm:zx"
import pkg from "./package.json" with { type: "json" };
let dict = {}

 for (const d in pkg.dependencies) {
    dict[d+""] = `npm:${d}@${pkg.dependencies[d]}`
 }

let files  = await $`find ./src -name '*.ts'`;
let file = files.stdout.split('\n');
file.forEach((f) => {dict[f.slice(0,-3)] = f})
console.log(dict);
