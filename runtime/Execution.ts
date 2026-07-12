import { isPrimitiveExpression, isSExprArray, parse, PrimitiveExpression, SExpr, SymbolToken } from "../parser/sexpr.js";
import { Discard, Evaluate, Instruction } from "./Intructions.js";
import type { PrimitiveValue } from "../language/Primitives.js";
import { DoneMessage, Message } from "./Messages.js";

type Environment = Record<string, any>;

class Address {
    constructor(
        readonly parts: readonly (string | number)[]
    ) {}

    public append(...parts: (string | number)[]) {
        return new Address([...this.parts,...parts]);
    }

    public hash() {
        return JSON.stringify(this.parts);
    }
}

class Execution {
    private ControlStack: Instruction[];
    private ValueStack: PrimitiveValue[];
    private Environment: Environment;
    public RNG: () => number;
    public LogW: number;

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

    public fork(rng = Math.random): Execution {
        return  new Execution([...this.ControlStack],[...this.ValueStack],{ ...this.Environment },rng,this.LogW)
    }

    public initialMachine(program: string, rng = Math.random): Execution {
        const generatedEnvironment: Environment = {};
        const parsedProgram = parse(program);

        let main = parsedProgram[parsedProgram.length-1]
        
        this.Environment = generatedEnvironment
        this.RNG = rng
        this.ControlStack.push(new Evaluate(main, generatedEnvironment, new Address([])))

        return this
    }

    public resume() : Message {
        while(this.ControlStack.length != 0 ){
            const instruction = this.ControlStack.pop();
            const message = instruction?.Execute(this)
            
            if (message) return message
        }

        return new DoneMessage(this.ValueStack.slice(-1)[0], this) 
    }

    public pushBody(body: SExpr[], environment: Environment, address: Address) 
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

    public pushToControlStack(instruction: Instruction) : void{
        this.ControlStack.push(instruction)
    }

    public popControlStack(): Instruction{
        return this.ControlStack.pop() as Instruction
    }

    public pushToValueStack(value: PrimitiveValue) : void{
        this.ValueStack.push(value)
    }

    public popValueStack(): PrimitiveValue {
        return this.ValueStack.pop() as PrimitiveValue
    }

    public getArguments(numberOfArguments: number) : Array<PrimitiveValue> {
        return this.ValueStack.splice(-numberOfArguments)
    }

    public send(value:PrimitiveValue) : void{
        this.ValueStack.push(value);
    }

    public updateLogW(newLogW:number): void {
        this.LogW = this.LogW + newLogW
    }
}

export {Execution, Environment, Address}