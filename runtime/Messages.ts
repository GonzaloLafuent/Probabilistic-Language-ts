import { Distribution } from "../language/distributions"
import { PrimitiveValue } from "../language/primitives"
import { Address, Machine } from "./machine"

abstract class Message {
   abstract messageName: string 
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
}

export {Message, SampleMessage, ObserveMessage, DoneMessage }