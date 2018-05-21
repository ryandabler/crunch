////////////////////
// Utilities
////////////////////
const typeOf = obj =>
    Object.prototype.toString.call(obj)
        .split(" ")[1]
        .slice(0, -1)

const isIterable = obj =>
    obj ? typeOf(obj[Symbol.iterator]) === "Function" : false

const objectify = iterable => {
    const retObj = []
    for (let elem of iterable) {
        retObj.push(
            typeOf(elem) !== "Object" ? { $data: elem } : elem
        );
    }

    return retObj;
}

const resolvePathAndGet = (obj, path) => {
    const segments = path.split(".");
	let pointer = obj;
	
	while (typeOf(pointer) === "Object" && segments.length > 0) {
		const segment = segments.shift();
		pointer = pointer[segment];
    }
	
    return pointer;
}

////////////////////
// Main
////////////////////
class Crunch {
    constructor(data) {
        data.forEach((item, idx) => this[idx] = item);
        this.length = [ ...data ].length;
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

    data() {
        const retObj = [];
        for (const elem of this) {
            retObj.push("$data" in elem ? elem.$data : elem)
        }
        
        return retObj;
    }

    slice({ begin = 0, end = this.length } = {}) {
        const retObj = [];
        
        for (let i = begin; i < end; i++) {
            retObj.push(this[i]);
        }

        return crunch(retObj);
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
    isIterable(data) ? new Crunch(objectify(data)) : new Crunch([])