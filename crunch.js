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
        return {
            next() {
                return this[i] ? { done: false, value: this[i] } : { done: true }
            }
        }
    }
}

const crunch = data => 
    isIterable(data) ? new Crunch(data) : new Crunch([])