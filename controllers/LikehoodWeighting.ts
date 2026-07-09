import type { PrimitiveValue } from "../language/primitives.js";
import { Machine } from "../runtime/machine.js";
import { Controller } from "./Controller.js";
import { DoneMessage, Message, ObserveMessage, SampleMessage } from "../runtime/Messages.js";

class LikehoodWeighting extends Controller {
    ControllerName = 'LikehoodWeighting'

    public run(program: string, rng: () => number, rngs: Array<() => number>, steps: number): Array<PrimitiveValue> {
        const values = [] as Array<PrimitiveValue>
        const log_Ws = [] as Array<PrimitiveValue>
        
        for (let i = 0; i<steps; i++ ){
            const message = this.singleRun(program, rng)
            values.push(message[0])
            log_Ws.push(message[1])
        }

        return [values, log_Ws]
    }

    private singleRun(program:string, rng: () => number){
        const machine = new Machine([],[],{},rng,0)
        machine.initialMachine(program,rng)

        while(true){
            const message = machine.resume()

            const value = message.execute(this)

            if(value)
                return value
        }
    }

    public sample(message:SampleMessage): void {
        const address = message.Address
        const distribution = message.Distribution
        const machine = message.Machine
        
        machine.send(distribution.sample(machine.RNG) as PrimitiveValue)
    }

    public observe(message:ObserveMessage): void {
        const distribution = message.Distribution
        const address = message.Address
        const observed = message.Observed
        const machine = message.Machine

        machine.setLogW(machine.LogW + distribution.logProb(observed))

        machine.send(observed)
    }

    public done(message:DoneMessage): Array<PrimitiveValue> {
        const logW = message.Machine.LogW
        const returnValue = message.ReturnValue
        return [returnValue, logW]
    }
}

export {LikehoodWeighting}