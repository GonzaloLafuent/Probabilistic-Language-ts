import { parseOne, walk } from "./parser/sexpr.js";

let program = "(let [m (sample (normal 0 1))] (observe (normal m 1) 2.0) m)"

console.log("pograma: ",program)

const ast = parseOne(program);
console.log("Programa parseado: ", ast)

