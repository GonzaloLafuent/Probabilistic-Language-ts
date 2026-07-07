import { isSExprArray, parse, SExpr, SymbolToken } from "../parser/sexpr";
import { Discard, Evaluate, Instruction } from "./Intructions";
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
    ControlStack: Instruction[];
    ValueStack: PrimitiveValue[];
    Environment: Environment;
    RNG: () => number;
    LogW: number;

    constructor(
        C: Instruction[],
        V: any[] = [],
        env = {},
        rng = Math.random,
        logW = 0
    ) {
        this.ControlStack = C;
        this.ValueStack = V;
        this.Environment = env;
        this.RNG = rng;
        this.LogW = logW;
    }

    fork(rng = Math.random): Machine {
        return new Machine(this.ControlStack, this.ValueStack, this.Environment, rng, this.LogW);
    }

    initialMachine(program: string, rng = Math.random): Machine {
        const generatedEnvironment: Environment = {};
        const parsedProgram = parse(program);
        let main = null as SExpr

        for (const form of parsedProgram) {
            if (isSExprArray(form) && ((form as Array<SExpr>)[0] as SymbolToken).name == 'defn') {
                //To do for defn
            } else {
                main = form;
            }
        }
        
        this.Environment = generatedEnvironment
        this.RNG = rng
        this.ControlStack.push(new Evaluate(main, generatedEnvironment, []))

        return this
    }

    resume() : Message {
        while(this.ControlStack.length != 0 ){
            const instruction = this.ControlStack.pop();
            const message = instruction?.Execute(this)

            if(message) return message
        }

        return new DoneMessage(this.ValueStack.slice(-1)[0], this) 
    }

    pushBody(body: SExpr[], environment: Environment, address: string[]) 
    {   
        const sequence = new Array<Instruction>
        body.slice(0, -1).forEach((b, n) => {
            sequence.push(new Evaluate(b,environment,address))
            sequence.push(new Discard())
        });
        sequence.push(new Evaluate(body[body.length - 1],environment,address))
        
        for(const instruction of sequence.reverse()) {
            this.ControlStack.push(instruction)
        }
    }

    send(value:PrimitiveValue) {
        this.ValueStack.push(value);
    }
}

export {Machine, Environment, Closure, Address}