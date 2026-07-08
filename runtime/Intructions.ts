import type { Address, Machine } from "./machine.js"
import type { Environment } from "./machine.js"
import { isSymbol, SExpr, isSExprArray, SymbolToken } from "../parser/sexpr.js"
import { isPrimitive, PRIMITIVES, PrimitiveValue } from "../language/primitives.js"
import { Message, ObserveMessage, SampleMessage } from "./Messages.js"
import { Distribution } from "../language/distributions.js"

abstract class Instruction {
    abstract instructionName: string

    abstract Execute(machine: Machine): void | Message
}

class Evaluate extends Instruction {
    instructionName = 'Evaluate'
    Environment: Environment
    Expression: SExpr
    Address: Address

    constructor(expression: SExpr, environment: Environment, address: Address){
        super()
        this.Environment = environment
        this. Expression = expression
        this.Address = address
    }
    
    Execute(machine: Machine): void {
        if(isSymbol(this.Expression)) {
            if (this.Expression.name in this.Environment) {
                machine.ValueStack.push(this.Environment[this.Expression.name])
            } else if (isPrimitive(this.Expression.name)){
                machine.ValueStack.push(PRIMITIVES[this.Expression.name]())
            }else{
                throw Error("Incorrect Name")
            }
        } else if (!isSExprArray(this.Expression) ) {
            machine.ValueStack.push(this.Expression)
        } else {
            const head = this.Expression[0] as SymbolToken
            const name = head.name
            if (name === 'let') {
                const [, binds, ...body] = this.Expression;
                if (binds){
                    machine.ControlStack.push(new LetContinuation(binds, 0, body, this.Environment, []))  
                    machine.ControlStack.push(new Evaluate((binds as Array<SExpr>)[1], this.Environment, []))                                      
                } else 
                {
                    machine.pushBody(body,this.Environment,[])
                }
            } else if (name === 'if'){
                const [, test, then, els] = this.Expression
                machine.ControlStack.push(new IfContinuation(then,els, this.Environment, []))
                machine.ControlStack.push(new Evaluate(test, this.Environment, []))
            } else if (name === 'fn'){
                //To Do
            } else if (name === 'sample'){
                machine.ControlStack.push(new SampleContinuation(this.Address));
                machine.ControlStack.push(new Evaluate(this.Expression[1], this.Environment, []))
            } else if (name === 'observe') {
                machine.ControlStack.push(new ObserveContinuation(this.Address))
                machine.ControlStack.push(new Evaluate(this.Expression[2], this.Environment, []))
                machine.ControlStack.push(new Evaluate(this.Expression[1], this.Environment, []))
            } else {
                // To Do
            }
        }
    }
}

class Discard extends Instruction {
    instructionName = 'Discard'

    Execute(machine: Machine): void {
        machine.ControlStack.pop()
    }
}

class LetContinuation extends Instruction {
    instructionName = 'Letk'
    Binds: SExpr
    IndexBind: number
    Body: SExpr
    Environment:Environment
    Address: Array<String>

    constructor(binds: SExpr, indexBind: number, body: SExpr, environment: Environment, address:Array<String>){
        super()
        this.Binds = binds
        this.IndexBind = indexBind
        this.Body = body
        this.Environment = environment
        this.Address = address
    }

    Execute(machine: Machine): void {
        let env = { ...this.Environment };
        env[(this.Binds as SymbolToken[])[2 * this.IndexBind].name] = machine.ValueStack.pop();
        if (2*(this.IndexBind +1) < (this.Binds as Array<SExpr>).length) {
            machine.ControlStack.push(new LetContinuation(this.Binds, this.IndexBind + 1, this.Body, this.Environment, []))
        } else {
            machine.pushBody(this.Body as Array<SExpr>, this.Environment, [])
        }
    }
}

class IfContinuation extends Instruction {
    instructionName = 'Ifk'
    Then: SExpr
    Els: SExpr
    Environment: Environment
    Address: Address

    constructor(then: SExpr, els: SExpr, environment: Environment, address: Address) {
        super()
        this.Then = then
        this.Els = els
        this.Environment = environment
        this.Address = address
    }

    Execute(machine: Machine): void {
        const [branch, tag ] =  machine.ValueStack.pop() ? [this.Then, 'then']: [this.Els, 'else']
        machine.ControlStack.push(new Evaluate(branch, this.Environment, []))
    }
}

class SampleContinuation extends Instruction {
    instructionName = 'Samplek'
    Address: Address

    constructor(address: Address){
        super()
        this.Address = address
    }

    Execute(machine: Machine): Message {
        const distribution = machine.ValueStack.pop()
        return new SampleMessage(this.Address, distribution as Distribution, machine)
    }
}

class ObserveContinuation extends Instruction {
    instructionName = 'Observek'
    Address: Address

    constructor(address:Address) {
        super()
        this.Address = address
    }

    Execute(machine: Machine): Message {
        const observed = machine.ValueStack.pop()
        const distribution = machine.ValueStack.pop()
        return new ObserveMessage(this.Address, distribution as Distribution, observed as PrimitiveValue, machine)
    }
}

class CallContinuation extends Instruction {
    instructionName = 'Callk'

    Execute(machine: Machine): void {
        //To Do
    }
}


export { Instruction, Evaluate, Discard}