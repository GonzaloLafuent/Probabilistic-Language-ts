import type { PrimitiveValue } from "../language/primitives.js";
import { DoneMessage, Message, ObserveMessage, SampleMessage } from "../runtime/Messages.js";

abstract class Controller {
    abstract ControllerName:string

    public abstract run(program:string, rng: ()=> number, steps:number, warmup:number): Array<PrimitiveValue>

    public abstract done(message:DoneMessage): Array<PrimitiveValue>

    public abstract sample(message:SampleMessage): void

    public abstract observe(message:ObserveMessage): void
}

export {Controller}