////////////////////
// Utilities
////////////////////
const typeOf = obj =>
    Object.prototype.toString.call(obj)
        .split(" ")[1]
        .slice(0, this.length - 1)

const isIterable = obj =>
    obj ? typeOf(obj[Symbol.iterator]) === "Function" : false

////////////////////
// Main
////////////////////
class Crunch {
    constructor(data) {
        data.forEach((item, idx) => this[idx] = item);
    }

    [Symbol.iterator]() {
        let i = 0;
        const _this = this;

        return {
            next() {
                return _this[i]
                    ? { done: false, value: _this[i++] }
                    : { done: true };
            }
        }
    }
}

Crunch.uniformDist = (begin = -1, end = 1) => {
    return (end - begin) * Math.random() + begin;
}

Crunch.normalDist = (mean, std) => {
    let s = 0;
    let u, v;

    while (s === 0 || s >= 1) {
        [ u, v ] = [ Crunch.uniformDist(), Crunch.uniformDist() ];
        s = u ** 2 + v ** 2;
    }

    const [ z0, z1 ] = [ u * Math.sqrt(-2 * Math.log(s) / s), null ];
    return z0 * std + mean;
}

const crunch = data => 
    isIterable(data) ? new Crunch(data) : new Crunch([])