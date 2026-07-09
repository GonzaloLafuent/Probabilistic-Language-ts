import { isSExprArray, parse, SExpr, SymbolToken } from "../parser/sexpr.js";
import { Discard, Evaluate, Instruction } from "./Intructions.js";
import type { PrimitiveValue } from "../language/primitives.js";
import { DoneMessage, Message } from "./Messages.js";

type Environment = Record<string, any>;

class Address {
    constructor(
        readonly parts: readonly (string | number)[]
    ) {}

    append(...parts: (string | number)[]) {
        return new Address([
            ...this.parts,
            ...parts
        ]);
    }

    toString() {
        return JSON.stringify(this.parts);
    }
}

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
        return  new Machine([...this.ControlStack],[...this.ValueStack],{ ...this.Environment },rng,this.LogW)
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
        this.ControlStack.push(new Evaluate(main, generatedEnvironment, new Address([])))

        return this
    }

    resume() : Message {
        while(this.ControlStack.length != 0 ){
            const instruction = this.ControlStack.pop();
            const message = instruction?.Execute(this)
            
            if (message) return message
        }

        return new DoneMessage(this.ValueStack.slice(-1)[0], this) 
    }

    pushBody(body: SExpr[], environment: Environment, address: Address) 
    {   
        const sequence = new Array<Instruction>
        body.slice(0, -1).forEach((b, n) => {
            sequence.push(new Evaluate(b,environment, address.append('body',n)))
            sequence.push(new Discard())
        });
        sequence.push(new Evaluate(body[body.length - 1], environment,address.append('body', body.length -1)))
        
        for(const instruction of sequence.reverse()) {
            this.ControlStack.push(instruction)
        }
    }

    send(value:PrimitiveValue) {
        this.ValueStack.push(value);
    }

    setLogW(newLogW:number){
        this.LogW = newLogW
    }
}

export {Machine, Environment, Closure, Address}