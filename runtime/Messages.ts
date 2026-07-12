import { Controller } from "../controllers/Controller.js"
import { Distribution } from "../language/Distributions.js"
import type { PrimitiveValue } from "../language/Primitives.js"
import type { Address, Execution } from "./Execution.js"

abstract class Message {
   abstract messageName: string 

   public abstract execute(controller:Controller): void | Array<PrimitiveValue>

    public abstract isSampleMessage() : Boolean

    public abstract isObserveMessage() : Boolean

    public abstract isDoneMessage() : Boolean
}

class SampleMessage extends Message {
    messageName = 'sample'
    Address: Address
    Distribution: Distribution
    Execution: Execution
    
    constructor(address: Address, distribution: Distribution, execution: Execution) {
        super()
        this.Address = address
        this.Distribution = distribution
        this.Execution = execution
    }
    
    execute(controller: Controller): void | Array<PrimitiveValue> {
        controller.sample(this)
    }
    
    public isSampleMessage() : Boolean{
        return true
    }
    public isObserveMessage() : Boolean{
        return false
    }
    public isDoneMessage() : Boolean{
        return false
    }
}

class ObserveMessage extends Message {
    messageName = 'observe'
    Address: Address
    Distribution: Distribution
    Observed: PrimitiveValue
    Execution: Execution
    
    constructor(address:Address, distribution:Distribution, observed:PrimitiveValue, execution:Execution){
        super()
        this.Address = address
        this.Distribution = distribution
        this.Observed = observed
        this.Execution = execution
    }
    
    execute(controller: Controller): void | Array<PrimitiveValue> {
        controller.observe(this)
    }
    
    public isSampleMessage() : Boolean{
        return false
    }
    public isObserveMessage() : Boolean{
        return true
    }
    public isDoneMessage() : Boolean{
        return false
    }
}

class DoneMessage extends Message {
    messageName = 'Done'
    Execution: Execution
    ReturnValue: PrimitiveValue
    
    constructor(returnValue:PrimitiveValue, execution: Execution){
        super()
        this.Execution = execution
        this.ReturnValue = returnValue
    }
    
    execute(controller: Controller): void | Array<PrimitiveValue> {
        return controller.done(this)
    }

    public isSampleMessage() : Boolean{
        return false
    }
    public isObserveMessage() :Boolean {
        return false
    }
    public isDoneMessage() : Boolean {
        return true
    }
}

export {Message, SampleMessage, ObserveMessage, DoneMessage }