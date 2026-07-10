import { softmax } from "../language/distributions.js";
import { PrimitiveValue } from "../language/primitives.js";
import { Machine } from "../runtime/machine.js";
import { DoneMessage, SampleMessage, ObserveMessage, Message } from "../runtime/Messages.js";
import { Controller } from "./Controller.js";

class SecuentialMonteCarlo extends Controller {
    ControllerName = 'Secuential Monte Carlo'
    private particles = [] as Array<Machine>
    private messages = [] as Array<Message>
    private paused: Machine[] = [];
    private logInc: number[] = [];

    public run(program: string, rng: () => number, rngs: Array<() => number>, particleCount:number): Array<PrimitiveValue> {
        this.particles = Array.from({ length: particleCount }, (_, i) => new Machine([],[],{},rng,0)
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

    private advance(machine:Machine): Message {
        let message = machine.resume()

        while(message.isSampleMessage()){
            message.execute(this)
            message = machine.resume()
        }

        return message
    }

    private resample(rngs: Array<() => number>){
        const probabilities = softmax(this.logInc)

        this.particles = [] as Machine[];

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
        const machine = message.Machine

        machine.send(distribution.sample(machine.RNG) as PrimitiveValue)
    }

    public observe(message: ObserveMessage): void {
      
        const distribution = message.Distribution
        const observed = message.Observed
        const machine = message.Machine
        const address = message.Address

        const log_w = distribution.logProb(observed)
        machine.setLogW(machine.LogW + log_w)
        
        this.logInc.push(log_w)
        machine.send(observed)
        this.paused.push(machine)
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