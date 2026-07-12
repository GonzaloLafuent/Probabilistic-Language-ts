import type { PrimitiveValue } from "../language/Primitives.js";
import { Execution } from "../runtime/Execution.js";
import { Controller, RunOptions } from "./Controller.js";
import { DoneMessage, Message, ObserveMessage, SampleMessage } from "../runtime/Messages.js";
import { softmax } from "../language/Distributions.js";

class LikehoodWeighting extends Controller {
    ControllerName = 'LikehoodWeighting'

    public run(program: string,runOptions: RunOptions): Array<PrimitiveValue> {
        const values = [] as Array<PrimitiveValue>
        const log_Ws = [] as Array<number>

        const rng = runOptions.rng as () => number
        const steps = runOptions.steps as number

        this.checkAllParametersNeedes(program,runOptions)
        
        for (let i = 0; i<steps; i++ ){
            const message = this.singleRun(program, rng)
            values.push(message[0])
            log_Ws.push(message[1] as number)
        }

        return [values, softmax(log_Ws)]
    }

    private checkAllParametersNeedes(program: string, runOptions: RunOptions){
        if(program.length == 0)
            throw Error('Missing program')
        else if(runOptions.rng == undefined)
            throw Error('Missing RNG')
        else if (runOptions.steps == undefined)
            throw Error('Missing steps')
    }

    private singleRun(program:string, rng: () => number){
        const execution = new Execution([],[],{},rng,0)
        execution.initialMachine(program,rng)

        while(true){
            const message = execution.resume()

            const value = message.execute(this)

            if(value)
                return value
        }
    }

    public sample(message:SampleMessage): void {
        const address = message.Address
        const distribution = message.Distribution
        const execution = message.Execution
        
        execution.send(distribution.sample(execution.RNG) as PrimitiveValue)
    }

    public observe(message:ObserveMessage): void {
        const distribution = message.Distribution
        const address = message.Address
        const observed = message.Observed
        const execution = message.Execution

        execution.updateLogW(distribution.logProb(observed))

        execution.send(observed)
    }

    public done(message:DoneMessage): Array<PrimitiveValue> {
        const logW = message.Execution.LogW
        const returnValue = message.ReturnValue
        return [returnValue, logW]
    }

    public mean(values:Array<number>, weights:Array<number>) {
        let mean = 0
        for(let i = 0; i < values.length; i++){
            mean = mean + values[i]*weights[i]
        }
        return mean
    }
}

export {LikehoodWeighting}