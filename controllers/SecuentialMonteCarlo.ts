import { softmax } from "../language/Distributions.js";
import { PrimitiveValue } from "../language/Primitives.js";
import { Execution } from "../runtime/Execution.js";
import { DoneMessage, SampleMessage, ObserveMessage, Message } from "../runtime/Messages.js";
import { Controller, RunOptions } from "./Controller.js";

class SecuentialMonteCarlo extends Controller {
    ControllerName = 'Secuential Monte Carlo'
    private particles = [] as Array<Execution>
    private messages = [] as Array<Message>
    private paused: Execution[] = [];
    private logInc: number[] = [];

    public run(program: string, runOptions: RunOptions): Array<PrimitiveValue> {
        const particleCount = runOptions.steps as number
        const rng = runOptions.rng as ()=> number
        const rngs = runOptions.rngs as Array<() => number>

        this.checkAllParametersNeedes(program, runOptions)
        
        this.particles = Array.from({ length: particleCount }, (_, i) => new Execution([],[],{},rng,0)
                                                                    .initialMachine(program, rngs[i])); 

        while(true){
            this.messages = this.particles.map(particle => this.advance(particle))

            if (!this.allMessagesOnDoneState() && !this.allMessageOnObserveState()) {
                throw new Error("Particles reached different breakpoints");
            }

            const value = this.messages.map(message  => message.execute(this)).flat()

            if(!value.every(val => val == undefined))
                return value as PrimitiveValue[]

            this.resample(rngs)
        } 
    }

    private checkAllParametersNeedes(program: string, runOptions: RunOptions){
        if(program.length == 0)
            throw Error('Missing program')
        else if(runOptions.rng == undefined)
            throw Error('Missing RNG')
        else if (runOptions.steps == undefined)
            throw Error('Missing steps')
        else if(runOptions.rngs == undefined || runOptions.rngs.length < runOptions.steps)
            throw Error('Missing rngs')
    }

    private advance(execution:Execution): Message {
        let message = execution.resume()

        while(message.isSampleMessage()){
            message.execute(this)
            message = execution.resume()
        }

        return message
    }

    private resample(rngs: Array<() => number>){
        const probabilities = softmax(this.logInc)

        this.particles = [] as Execution[];

        for (let j = 0; j < this.paused.length; j++) {

            const ancestor = this.sampleIndex(probabilities, rngs[j]);

            this.particles.push(this.paused[ancestor].fork(rngs[j]));
        }

        this.paused = []
        this.logInc = []
    }

    private sampleIndex(probabilities: number[], rng: () => number): number {
        const u = rng();
        let cumulative = 0;

        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (u <= cumulative) {
                return i;
            }
        }

        return probabilities.length - 1;
    }

    public done(message: DoneMessage): Array<PrimitiveValue> {
        return [message.ReturnValue]
    }

    public sample(message: SampleMessage): void {
        const addres = message.Address
        const distribution = message.Distribution
        const execution = message.Execution

        execution.send(distribution.sample(execution.RNG) as PrimitiveValue)
    }

    public observe(message: ObserveMessage): void {
      
        const distribution = message.Distribution
        const observed = message.Observed
        const execution = message.Execution
        const address = message.Address

        const log_w = distribution.logProb(observed)
        execution.updateLogW(log_w)
        
        this.logInc.push(log_w)
        execution.send(observed)
        this.paused.push(execution)
    }

    private allMessagesOnDoneState() {
        return !this.messages.some(message => !message.isDoneMessage())
    }

    private allMessageOnObserveState(){
        return !this.messages.some(message => !message.isObserveMessage())
    }

    public mean(values: Array<number>): number {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    
}

export {SecuentialMonteCarlo}