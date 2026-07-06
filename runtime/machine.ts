import { parse, SExpr } from "../parser/sexpr";
import { Instruction } from "./Intructions";
import { PrimitiveValue } from "../language/primitives";
import { DoneMessage, Message } from "./Messages";

type Environment = Record<string, any>;

type Address = Array<string> //This must change, take in count for MH

class Closure {
    Body: SExpr[];
    Parameters: string[];
    Environment: Environment;

    constructor(body: SExpr[], parameters: string[], environment: Environment) {
        this.Body = body;
        this.Parameters = parameters;
        this.Environment = environment;
    }
}

class Machine {
    C: Instruction[];
    V: PrimitiveValue[];
    env: Environment;
    rng: () => number;
    logW: number;

    constructor(
        C: Instruction[],
        V: any[] = [],
        env = {},
        rng = Math.random,
        logW = 0
    ) {
        this.C = C;
        this.V = V;
        this.env = env;
        this.rng = rng;
        this.logW = logW;
    }

    fork(rng = Math.random): Machine {
        return new Machine(this.C, this.V, this.env, rng, this.logW);
    }
}

function initialMachine(program: string, rng = Math.random): Machine {
    const generatedEnvironment: Environment = {};
    const parsedProgram = parse(program);
    let main = null

    for (const form of parsedProgram) {
        if (Array.isArray(form) && form[0] === "defn") {
            
        } else {
            main = form;
        }
    }

    return initialMachine
}

/**  
Dentro del stack tengo lo siguiente
("ev", expr, env, addr)
("letk", binds, i, body, env, addr)
("ifk", then, else, env, addr)
("callk", argc, addr)
("samplek", addr)
("observek", addr)
("discard")
**/

function resume(machine: Machine) : Message {
    while(machine.C.length != 0 ){
        const instruction = machine.C.pop();
        const message = instruction?.Execute(machine)

        if(message) return message
    }

    return new DoneMessage(machine.V.slice(-1)[0], machine)
}

function pushBody(C: Instruction[], body: SExpr[], env: Environment, addr: any[]) 
{

}

function send(Machine: Machine, value:any) {
    Machine.V.push(value);
}

export {Machine, Environment, Closure, Address}