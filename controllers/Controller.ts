import type { PrimitiveValue } from "../language/Primitives.js";
import { DoneMessage, Message, ObserveMessage, SampleMessage } from "../runtime/Messages.js";

interface RunOptions {
    rng?: () => number;
    rngs?: Array<() => number>;
    steps?: number;
    warmup?: number;
}

abstract class Controller {
    abstract ControllerName:string

    public abstract run(program:string, runOptions: RunOptions): Array<PrimitiveValue>

    public abstract done(message:DoneMessage): Array<PrimitiveValue>

    public abstract sample(message:SampleMessage): void

    public abstract observe(message:ObserveMessage): void
}

export {Controller, RunOptions}