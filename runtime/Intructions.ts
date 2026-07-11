import { Address, Machine } from "./machine.js"
import type { Environment } from "./machine.js"
import { isSymbol, SExpr, isSExprArray, SymbolToken, isPrimitiveExpression, PrimitiveExpression,  } from "../parser/sexpr.js"
import { Closure, isPrimitive, PRIMITIVES, PrimitiveValue } from "../language/primitives.js"
import { Message, ObserveMessage, SampleMessage } from "./Messages.js"
import { Distribution } from "../language/distributions.js"

abstract class Instruction {
    public abstract instructionName: string

    public abstract Execute(machine: Machine): void | Message
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
    
    public Execute(machine: Machine): void  {
        if(isSymbol(this.Expression)) {
            if (this.Expression.name in this.Environment) {
                machine.ValueStack.push(this.Environment[this.Expression.name])
            } else if (isPrimitive(this.Expression.name)){
                machine.ValueStack.push(PRIMITIVES[this.Expression.name])
            }else{
                throw Error("Incorrect Name")
            }
        } else if (!isSExprArray(this.Expression) && !isPrimitiveExpression(this.Expression)) {
            machine.ValueStack.push(this.Expression)
        } else {
            const head = (this.Expression instanceof PrimitiveExpression)? this.Expression: (this.Expression as Array<SExpr>)[0]
            
            if (isPrimitiveExpression(head)) {
                head.execute(this.Expression, machine, this.Environment, this.Address) 
            } else {
                const expression = this.Expression as Array<SExpr>

                machine.ControlStack.push(new CallContinuation(expression.length - 1, this.Address))

                for (let i = expression.length - 1; i > 0; i--) {
                    machine.ControlStack.push(new Evaluate(expression[i], this.Environment, this.Address.append(i-1)))
                }
                machine.ControlStack.push(new Evaluate(expression[0], this.Environment, this.Address.append('fn')))
            }
        }

        return 
    }
}

class Discard extends Instruction {
    instructionName = 'Discard'

    public Execute(machine: Machine): void {
        machine.ValueStack.pop()
    }
}

class LetContinuation extends Instruction {
    instructionName = 'Letk'
    Binds: SExpr
    IndexBind: number
    Body: SExpr
    Environment:Environment
    Address: Address

    constructor(binds: SExpr, indexBind: number, body: SExpr, environment: Environment, address:Address){
        super()
        this.Binds = binds
        this.IndexBind = indexBind
        this.Body = body
        this.Environment = environment
        this.Address = address
    }

    public Execute(machine: Machine): void {
        let newEnvironment = { ...this.Environment };
        newEnvironment[(this.Binds as SymbolToken[])[2 * this.IndexBind].name] = machine.ValueStack.pop();
        if (2*(this.IndexBind +1) < (this.Binds as Array<SExpr>).length) {
            machine.ControlStack.push(new LetContinuation(this.Binds, this.IndexBind + 1, this.Body, newEnvironment, this.Address))
            machine.ControlStack.push(new Evaluate((this.Binds as SExpr[])[2*(this.IndexBind+1)+1],newEnvironment,this.Address.append(2*(this.IndexBind+1))))
        } else {
            machine.pushBody(this.Body as Array<SExpr>, newEnvironment, this.Address)
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

    public Execute(machine: Machine): void {
        const [branch, tag ] =  machine.ValueStack.pop() ? [this.Then, 'then']: [this.Els, 'else']
        machine.ControlStack.push(new Evaluate(branch, this.Environment, this.Address.append(tag)))
    }
}

class SampleContinuation extends Instruction {
    instructionName = 'Samplek'
    Address: Address

    constructor(address: Address){
        super()
        this.Address = address
    }

    public Execute(machine: Machine): Message {
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

    public Execute(machine: Machine): Message {
        const observed = machine.ValueStack.pop()
        const distribution = machine.ValueStack.pop()
        
        return new ObserveMessage(this.Address, distribution as Distribution, observed as PrimitiveValue, machine)
    }
}

class CallContinuation extends Instruction {
    instructionName = 'Callk'
    NumberOfParameters:Number
    Address:Address

    constructor(numberOfParameters:number, addres:Address){
        super()
        this.NumberOfParameters = numberOfParameters
        this.Address = addres
    }

    public Execute(machine: Machine): void {
        const args = machine.ValueStack.splice(-this.NumberOfParameters);
        const func = machine.ValueStack.pop() as ((...args: PrimitiveValue[]) => PrimitiveValue)
        
        if (func  instanceof Closure) { 
            const newEnvironment = { ...func.Environment };
            const parameters = func.Parameters as Array<SymbolToken>
        
            for (let i = 0; i < parameters.length; i++) { 
                newEnvironment[(parameters[i] as SymbolToken).name] = args[i]; 
            }

            machine.pushBody(func.Body as Array<SExpr>, newEnvironment, this.Address); 
        } else {
            const value = func(...args) as PrimitiveValue
            machine.ValueStack.push(value)
        }
    }
}


export { Instruction, Evaluate, Discard, LetContinuation, IfContinuation, SampleContinuation, ObserveContinuation, CallContinuation}

