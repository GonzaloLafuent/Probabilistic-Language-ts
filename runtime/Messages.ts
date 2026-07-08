import { Controller } from "../controllers/Controller.js"
import { Distribution } from "../language/distributions.js"
import type { PrimitiveValue } from "../language/primitives.js"
import type { Address, Machine } from "./machine.js"

abstract class Message {
   abstract messageName: string 

   abstract execute(controller:Controller): void | Array<PrimitiveValue>
}

class SampleMessage extends Message {
    messageName = 'sample'
    Address: Address
    Distribution: Distribution
    Machine: Machine

    constructor(address: Address, distribution: Distribution, machine: Machine) {
        super()
        this.Address = address
        this.Distribution = distribution
        this.Machine = machine
    }

    execute(controller: Controller): void | Array<PrimitiveValue> {
        controller.sample(this)
    }
}

class ObserveMessage extends Message {
    messageName = 'observe'
    Address: Address
    Distribution: Distribution
    Observed: PrimitiveValue
    Machine: Machine

    constructor(address:Address, distribution:Distribution, observed:PrimitiveValue, machine:Machine){
        super()
        this.Address = address
        this.Distribution = distribution
        this.Observed = observed
        this.Machine = machine
    }

    execute(controller: Controller): void | Array<PrimitiveValue> {
        controller.observe(this)
    }
}

class DoneMessage extends Message {
    messageName = 'Done'
    Machine: Machine
    ReturnValue: PrimitiveValue

    constructor(returnValue:PrimitiveValue, machine: Machine){
        super()
        this.Machine = machine
        this.ReturnValue = returnValue
    }

    execute(controller: Controller): void | Array<PrimitiveValue> {
        return controller.done(this)
    }
}

export {Message, SampleMessage, ObserveMessage, DoneMessage }