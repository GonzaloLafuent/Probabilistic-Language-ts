import { LikehoodWeighting } from "./controllers/LikehoodWeighting.js";
import { MetropolisHasting } from "./controllers/MetropolisHasting.js";
import { SecuentialMonteCarlo } from "./controllers/SecuentialMonteCarlo.js";
import { Normal } from "./language/Distributions.js";
import { PrimitiveValue } from "./language/Primitives.js";
import { parseOne } from "./parser/sexpr.js";

let program = '(let [mu (sample (normal 0 1))] (observe (normal mu 1) 2.3) mu)' // Define your program

console.log("Program: ",program)

let ats = parseOne(program)

const controller_lw = new LikehoodWeighting()

let message_lw = controller_lw.run(program, {rng: Math.random, steps: 100000})

console.log("LW Mean:",controller_lw.mean(message_lw[0] as Array<number>, message_lw[1] as Array<number>))

const controller_smc = new SecuentialMonteCarlo()

const message_smc = controller_smc.run(program, {rng:Math.random, rngs: new Array(20000).fill(Math.random), steps: 20000})

console.log("SMC Mean:", controller_smc.mean(message_smc as Array<number>))

const controller_mh = new MetropolisHasting()

const message_mh = controller_mh.run(program, {rng: Math.random, steps: 60000, warmup: 3000})

console.log("MH Mean: ", controller_mh.mean(message_mh as Array<number>))
