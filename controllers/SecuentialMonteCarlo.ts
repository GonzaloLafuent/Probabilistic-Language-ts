import { PrimitiveValue } from "../language/primitives.js";
import { Machine } from "../runtime/machine.js";
import { DoneMessage, SampleMessage, ObserveMessage, Message } from "../runtime/Messages.js";
import { Controller } from "./Controller.js";

class SecuentialMonteCarlo extends Controller {
    ControllerName = 'Secuential Monte Carlo'
    steps = 0
    particles = [] as Array<Machine>
    messages = [] as Array<Message>

    public run(program: string, rng: () => number, rngs: Array<() => number>, steps:number): Array<PrimitiveValue> {
        this.steps = steps

        const particles = Array.from({ length: steps }, (_, i) => new Machine([],[],{},rng,0)
                                                                    .initialMachine(program, rngs[i])); 

        for(let i = 0; i<steps; i++){

        }

        throw new Error("Method not implemented.");
    }
    public done(message: DoneMessage): Array<PrimitiveValue> {
        throw new Error("Method not implemented.");
    }
    public sample(message: SampleMessage): void {
        throw new Error("Method not implemented.");
    }
    public observe(message: ObserveMessage): void {
        throw new Error("Method not implemented.");
    }

    private allMessagesOnDoneState(messages:Array<Message>) {
        return !messages.some(message => !message.isDoneMessage())
    }

    private allMessageOnObserveState(messages:Array<Message>){
        return !messages.some(message => !message.isObserveMessage())
    }
    
}