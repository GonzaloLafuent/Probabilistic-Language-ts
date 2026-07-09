import { PrimitiveValue } from "../language/primitives";
import { Machine } from "../runtime/machine";
import { DoneMessage, SampleMessage, ObserveMessage } from "../runtime/Messages";
import { Controller } from "./Controller";

class MetropolisHasting extends Controller {
    ControllerName = 'Single Site - Metropolis Hasting'
    trace_value : { [key: string]: any } = {};
    sample_log_probs : { [key: string]: any } = {};
    observe_log_probs : { [key: string]: any } = {};
    resampleAddress = ''

    public run(program:string, rng: ()=> number, rngs: Array<() => number>, steps:number, warmup:number): Array<PrimitiveValue> {
        let value, newValue
        
        [value, this.trace_value,this.sample_log_probs, this.observe_log_probs] = this.singleRun(program, rng)

        const chain = [] as Array<PrimitiveValue>
        for(let i = 0; i < warmup + steps; i++) {
            this.resampleAddress = 'Check' // Check

            let newValue: PrimitiveValue, newTrace_value: {}, newSample_log_probs: {}, newObserve_log_probs: {}
            [newValue, newTrace_value, newSample_log_probs, newObserve_log_probs] = this.singleRun(program, rng)
            const log_alpha = this.logAlpha(
                                        newTrace_value,
                                        newSample_log_probs,
                                        newObserve_log_probs
                                    )

            if(Math.log(rng()) < log_alpha){
                value = newValue
                this.trace_value = newTrace_value
                this.sample_log_probs = newSample_log_probs
                this.observe_log_probs = newObserve_log_probs
            }

            if (i >= warmup)
                chain.push(value)
        }
        return chain
    }

    private logAlpha(newTrace_value: { [key: string]: any }, newSample_log_probs: { [key: string]: any }, newObserve_log_probs: { [key: string]: any }): number{
        return 0
    }

    private initializeValues() {
        this.observe_log_probs = {}
        this.sample_log_probs = {}
        this.trace_value = {}
        this.resampleAddress = ''
    }

    private singleRun(program:string, rng: () => number): [PrimitiveValue,{},{},{}]{
        const machine = new Machine([],[],{},rng,0).initialMachine(program)

        this.initializeValues()

        while(true){
            const message = machine.resume()
            const value = message.execute(this)

            if(value)
                return [value.flat(), this.trace_value, this.sample_log_probs, this.observe_log_probs]
        }
    }

    public done(message: DoneMessage): Array<PrimitiveValue> {
       const value = message.ReturnValue
       return [value]
    }

    public sample(message: SampleMessage): void {
        const address = message.Address
        const distribution = message.Distribution
        const machine = message.Machine
        
        if(address.toString() in this.trace_value && address.toString() != this.resampleAddress){
            this.trace_value[address.toString()] = this.trace_value[address.toString()]
        } else {
            const x = distribution.sample(machine.RNG)
            this.trace_value[address.toString()] = x
            this.sample_log_probs[address.toString()] = distribution.logProb(x)
            machine.send(x as PrimitiveValue)
        }
    }

    public observe(message: ObserveMessage): void {
        const address = message.Address
        const distribution = message.Distribution
        const observed = message.Observed
        const machine = message.Machine

        this.observe_log_probs[address.toString()] = distribution.logProb(observed)
        machine.send(observed)
    }
    
}