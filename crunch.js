////////////////////
// Utilities
////////////////////
const typeOf = obj =>
    Object.prototype.toString.call(obj)
        .split(" ")[1]
        .slice(0, this.length - 1)

const isIterable = obj =>
    obj ? typeOf(obj[Symbol.iterator]) === "Function" : false