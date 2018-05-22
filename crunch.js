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

    group({ groupBy = [], calculations = [] } = {}) {
        const groups = [];
        let fodder = [ ...this ];

        while (fodder.length > 0) {
            const firstMatch = fodder.shift();

            // Assemble list of values to match
            const valuesToMatch = {};
            groupBy.forEach(condition => {
                valuesToMatch[condition.path] = resolvePathAndGet(firstMatch, condition.path);
            });

            // Find matching elements
            const matches = fodder.filter(item => {
                let _matches = true;
                for (const path in valuesToMatch) {
                    _matches = _matches && resolvePathAndGet(item, path) === valuesToMatch[path];
                }

                return _matches;
            });

            const group = [ firstMatch, ...matches ];
            groups.push(group);

            // Remove elements from list
            fodder = fodder.filter(item => {
                return !matches.includes(item);
            });
        }

        return groups.map(group => {
            const consolidatedObj = {};

            groupBy.forEach(condition => {
                consolidatedObj[condition.name] = resolvePathAndGet(group[0], condition.path);
            });

            calculations.forEach(calculation => {
                let reducedValue;

                if (calculation.operation === "sum") {
                    reducedValue = 0;

                    group.forEach(_group => {
                        reducedValue += resolvePathAndGet(_group, calculation.path);
                    });
                }

                consolidatedObj[calculation.name] = reducedValue;
            });

            return consolidatedObj;
        })
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

Crunch.round = (number, places) => {
    return Math.round(number * 10 ** places) / 10 ** places;
}

Crunch.isPrime = number => {
    const upperLimit = Math.ceil(Math.sqrt(number));
    for (let n = 2; n <= upperLimit; n++) {
        if (number % n === 0) return false;
    }

    return true;
}

const crunch = data => 
    isIterable(data) ? new Crunch(objectify(data)) : new Crunch([])