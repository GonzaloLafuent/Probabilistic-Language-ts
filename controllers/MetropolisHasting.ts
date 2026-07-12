import { PrimitiveValue } from "../language/Primitives.js";
import { Execution } from "../runtime/Execution.js";
import { DoneMessage, SampleMessage, ObserveMessage } from "../runtime/Messages.js";
import { Controller, RunOptions } from "./Controller.js";

class MetropolisHasting extends Controller {
    ControllerName = 'Single Site - Metropolis Hasting'
    private trace_values : Record<string, PrimitiveValue> = {};
    private new_trace_values: Record<string, PrimitiveValue> = {};
    private sample_log_probs: Record<string, PrimitiveValue> = {};
    private new_sample_log_probs: Record<string, PrimitiveValue> = {};
    private observe_log_probs : Record<string, PrimitiveValue> = {};
    private new_observe_log_probs: Record<string, PrimitiveValue> = {}
    private resampleAddress = ''

    public run(program:string, runOptions: RunOptions): Array<PrimitiveValue> {
        const rng = runOptions.rng as (() => number)
        const warmup = runOptions.warmup as number
        const steps = runOptions.steps as number 
        
        this.checkAllParametersNeedes(program, runOptions)

        let value, newValue
        value = this.singleRun(program, rng)

        this.setInitialTraces()

        const chain = [] as Array<PrimitiveValue>
        for(let i = 0; i < warmup + steps; i++) {
            this.resampleAddress = this.chooseResampleAddress(rng)

            newValue = this.singleRun(program, rng)
            const log_alpha = this.logAlpha()

            if(Math.log(rng()) < log_alpha){
                value = newValue
                this.setInitialTraces()
            } 

            if (i >= warmup)
                chain.push(value)
        }
        return chain.flat()
    }

    private checkAllParametersNeedes(program: string, runOptions: RunOptions){
        if(program.length == 0)
            throw Error('Missing program')
        else if(runOptions.rng == undefined)
            throw Error('Missing RNG')
        else if (runOptions.steps == undefined)
            throw Error('Missing steps')
        else if(runOptions.warmup == undefined)
            throw Error('Missing rngs')
    }

    private chooseResampleAddress(rng: () => number): string {
        const addresses = Object.keys(this.trace_values);

        const index = Math.floor(rng() * addresses.length);

        return addresses[index];
    }

    private setInitialTraces(){
        this.trace_values = { ...this.new_trace_values };
        this.sample_log_probs = { ...this.new_sample_log_probs };
        this.observe_log_probs = { ...this.new_observe_log_probs };
    }

    private initializeNewTraces(){
        this.new_trace_values = {} as { [key: string]: any }
        this.new_sample_log_probs = {} as { [key: string]: any }
        this.new_observe_log_probs = {} as { [key: string]: any }
    }

    private getSites(trace: Record<string,PrimitiveValue>, new_trace: Record<string,PrimitiveValue>) : Set<string>{
        const key = this.resampleAddress.toString()
        const sites = new Set<string>([key]);
        for (const k of Object.keys(trace)) {
            if (!(k in new_trace)) sites.add(k);
        }

        return sites
    }

    private probabilitiesSum(sample_values: Record<string,PrimitiveValue>, observe_values: Record<string,PrimitiveValue>, discriminator: Set<string>): number{
        let sum = 0;
        for (const k of Object.keys(sample_values)) {
            if (!discriminator.has(k)) {
                sum += sample_values[k] as number || 0; 
            }
        }
        for (const k of Object.keys(observe_values)) {
            sum += observe_values[k] as number || 0;
        }

        return sum
    }

    private logAlpha(): number {
        const new_sites = this.getSites(this.new_trace_values, this.trace_values)
        const old_sites = this.getSites(this.trace_values, this.new_trace_values)

        let num = this.probabilitiesSum(this.new_sample_log_probs, this.new_observe_log_probs, new_sites)
        let den = this.probabilitiesSum(this.sample_log_probs, this.observe_log_probs, old_sites)

        const len_trace_values = Object.keys(this.trace_values).length;
        const len_new_trace_values = Object.keys(this.new_trace_values).length;
        
        const hastingsCorrection = (len_trace_values > 0 && len_new_trace_values > 0) 
                                    ? Math.log(len_trace_values) - Math.log(len_new_trace_values) 
                                    : 0;

        return hastingsCorrection + (num - den);
    }

    private singleRun(program:string, rng: () => number): PrimitiveValue{
        const execution = new Execution([],[],{},rng,0).initialMachine(program)

        this.initializeNewTraces()

        while(true){
            const message = execution.resume()
            const value = message.execute(this)

            if(value)
                return value
        }
    }

    public done(message: DoneMessage): Array<PrimitiveValue> {
       const value = message.ReturnValue
       return [value]
    }

    public sample(message: SampleMessage): void {
        const key = message.Address.hash();

        let x : PrimitiveValue;

        if (key in this.trace_values && key != this.resampleAddress) {
            x = this.trace_values[key];
        }
        else {
            x = message.Distribution.sample(message.Execution.RNG) as number;
        }

        this.new_trace_values[key] = x;
        this.new_sample_log_probs[key] = message.Distribution.logProb(x);
        message.Execution.send(x);
    }

    public observe(message: ObserveMessage): void {
        const address = message.Address
        const distribution = message.Distribution
        const observed = message.Observed
        const execution = message.Execution

        this.new_observe_log_probs[address.hash()] = distribution.logProb(observed)
        execution.send(observed)
    }

    public mean(values: Array<number>): number {
        return values.reduce((sum, x) => sum + x, 0) / values.length;
    }
    
}

export {MetropolisHasting}