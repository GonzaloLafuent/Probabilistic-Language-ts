import { LikehoodWeighting } from "./controllers/LikehoodWeighting.js";
import { parseOne } from "./parser/sexpr.js";

let program = '42'

console.log("Program: ",program)

const ast = parseOne(program);
console.log("Parsed program: ", ast)

const controller = new LikehoodWeighting()

const message = controller.run(program, Math.random)

console.log("Message:", message)

