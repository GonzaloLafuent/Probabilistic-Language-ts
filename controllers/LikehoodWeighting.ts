import type { PrimitiveValue } from "../language/primitives.js";
import { Machine } from "../runtime/machine.js";
import { Controller } from "./Controller.js";
import { DoneMessage, Message, ObserveMessage, SampleMessage } from "../runtime/Messages.js";

class LikehoodWeighting extends Controller {
    ControllerName = 'LikehoodWeighting'

    run(program: string, rng: () => number): Array<PrimitiveValue> {
        const machine = new Machine([],[],{},rng,0)
        machine.initialMachine(program,rng)

        while(true){
            const message = machine.resume()

            const value = message.execute(this)

            console.log("Value", value)

            if(value)
                return value
        }
    }

    sample(message:SampleMessage): void {
        const address = message.Address
        const distribution = message.Distribution
        const machine = message.Machine
        
        machine.send(distribution.sample(machine.RNG) as PrimitiveValue)
    }

    observe(message:ObserveMessage): void {
        const distribution = message.Distribution
        const address = message.Address
        const observed = message.Observed
        const machine = message.Machine

        machine.setLogW(machine.LogW + distribution.logProb(observed))

        machine.send(observed)
    }

    done(message:DoneMessage): Array<PrimitiveValue> {
        const logW = message.Machine.LogW
        const returnValue = message.ReturnValue
        return [returnValue, logW]
    }
}

export {LikehoodWeighting}