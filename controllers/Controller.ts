import { PrimitiveValue } from "../language/primitives";
import { DoneMessage, Message, ObserveMessage, SampleMessage } from "../runtime/Messages";

abstract class Controller {
    abstract ControllerName:string

    abstract run(program:string,rng:() => number): Array<PrimitiveValue>

    abstract done(message:DoneMessage): Array<PrimitiveValue>

    abstract sample(message:SampleMessage): void

    abstract observe(message:ObserveMessage): void
}

export {Controller}