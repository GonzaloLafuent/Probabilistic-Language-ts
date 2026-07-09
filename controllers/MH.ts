import { PrimitiveValue } from "../language/primitives";
import { DoneMessage, SampleMessage, ObserveMessage } from "../runtime/Messages";
import { Controller } from "./Controller";

class MetropolisHasting extends Controller {
    ControllerName = 'Single Site - Metropolis Hasting'
    public run(program: string, rng: () => number): Array<PrimitiveValue> {
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
    
}