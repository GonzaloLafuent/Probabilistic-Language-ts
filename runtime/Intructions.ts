import { Address, Execution } from "./Execution.js"
import type { Environment } from "./Execution.js"
import { isSymbol, SExpr, isSExprArray, SymbolToken, isPrimitiveExpression, PrimitiveExpression,  } from "../parser/sexpr.js"
import { Closure, isPrimitive, PRIMITIVES, PrimitiveValue } from "../language/Primitives.js"
import { Message, ObserveMessage, SampleMessage } from "./Messages.js"
import { Distribution } from "../language/Distributions.js"

abstract class Instruction {
    public abstract instructionName: string

    public abstract Execute(execution: Execution): void | Message
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
    
    public Execute(execution: Execution): void  {
        if(isSymbol(this.Expression)) {
            if (this.Expression.name in this.Environment) {
                execution.pushToValueStack(this.Environment[this.Expression.name])
            } else if (isPrimitive(this.Expression.name)){
                execution.pushToValueStack(PRIMITIVES[this.Expression.name])
            }else{
                throw Error("Incorrect Name")
            }
        } else if (!isSExprArray(this.Expression) && !isPrimitiveExpression(this.Expression)) {
            execution.pushToValueStack(this.Expression)
        } else {
            const head = (this.Expression instanceof PrimitiveExpression)? this.Expression: (this.Expression as Array<SExpr>)[0]
            
            if (isPrimitiveExpression(head)) {
                head.evaluate(this.Expression, execution, this.Environment, this.Address) 
            } else {
                const expression = this.Expression as Array<SExpr>

                execution.pushToControlStack(new CallContinuation(expression.length - 1, this.Address))

                for (let i = expression.length - 1; i > 0; i--) {
                    execution.pushToControlStack(new Evaluate(expression[i], this.Environment, this.Address.append(i-1)))
                }
                execution.pushToControlStack(new Evaluate(expression[0], this.Environment, this.Address.append('fn')))
            }
        }

        return 
    }
}

class Discard extends Instruction {
    instructionName = 'Discard'

    public Execute(execution: Execution): void {
        execution.popValueStack()
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

    public Execute(execution: Execution): void {
        let newEnvironment = { ...this.Environment };
        newEnvironment[(this.Binds as SymbolToken[])[2 * this.IndexBind].name] = execution.popValueStack();
        if (2*(this.IndexBind +1) < (this.Binds as Array<SExpr>).length) {
            execution.pushToControlStack(new LetContinuation(this.Binds, this.IndexBind + 1, this.Body, newEnvironment, this.Address))
            execution.pushToControlStack(new Evaluate((this.Binds as SExpr[])[2*(this.IndexBind+1)+1],newEnvironment,this.Address.append(2*(this.IndexBind+1))))
        } else {
            execution.pushBody(this.Body as Array<SExpr>, newEnvironment, this.Address)
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

    public Execute(execution: Execution): void {
        const [branch, tag ] =  execution.popValueStack() ? [this.Then, 'then']: [this.Els, 'else']
        execution.pushToControlStack(new Evaluate(branch, this.Environment, this.Address.append(tag)))
    }
}

class SampleContinuation extends Instruction {
    instructionName = 'Samplek'
    Address: Address

    constructor(address: Address){
        super()
        this.Address = address
    }

    public Execute(execution: Execution): Message {
        const distribution = execution.popValueStack()
        return new SampleMessage(this.Address, distribution as Distribution, execution)
    }
}

class ObserveContinuation extends Instruction {
    instructionName = 'Observek'
    Address: Address

    constructor(address:Address) {
        super()
        this.Address = address
    }

    public Execute(execution: Execution): Message {
        const observed = execution.popValueStack()
        const distribution = execution.popValueStack()
        
        return new ObserveMessage(this.Address, distribution as Distribution, observed as PrimitiveValue, execution)
    }
}

class CallContinuation extends Instruction {
    instructionName = 'Callk'
    NumberOfParameters:number
    Address:Address

    constructor(numberOfParameters:number, addres:Address){
        super()
        this.NumberOfParameters = numberOfParameters
        this.Address = addres
    }

    public Execute(execution: Execution): void {
        const args = execution.getArguments(this.NumberOfParameters)
        const func = execution.popValueStack() as ((...args: PrimitiveValue[]) => PrimitiveValue)
        
        if (func  instanceof Closure) { 
            const newEnvironment = { ...func.Environment };
            const parameters = func.Parameters as Array<SymbolToken>
        
            for (let i = 0; i < parameters.length; i++) { 
                newEnvironment[(parameters[i] as SymbolToken).name] = args[i]; 
            }

            execution.pushBody(func.Body as Array<SExpr>, newEnvironment, this.Address); 
        } else {
            const value = func(...args) as PrimitiveValue
            execution.pushToValueStack(value)
        }
    }
}


export { Instruction, Evaluate, Discard, LetContinuation, IfContinuation, SampleContinuation, ObserveContinuation, CallContinuation}

