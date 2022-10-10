import { BufferRange } from "../range";

export class RcsMaterial {
    range = new BufferRange();

    static load(buffer: ArrayBuffer): RcsMaterial {
        const ret = new RcsMaterial();
        return ret;
    }
}