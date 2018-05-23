////////////////////
// Utilities
////////////////////
const MV_AVG_TRAIL = "TRAIL",
      MV_AVG_LEAD = "LEAD",
      MV_AVG_CENTER = "CENTER";

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

const consolidateObj = (group, groupBy) => {
    const retObj = {}

    groupBy.forEach(condition => {
        retObj[condition.name] = resolvePathAndGet(group[0], condition.path);
    });

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

const resolvePathAndSet = (val, path) => {
    const retObj = {};
    let pointer = retObj;

    path.split(".").forEach((_path, idx, arr) => {
        pointer[_path] = idx === arr.length - 1 ? val : {};
        pointer = pointer[_path];
    });

    return retObj;
}

const generateCalculation = (key, val, call = 1) => {
    let name = "";
    let operation;
    
    if (call === 1) {
        key.split(".").forEach(path => {
            name += path.charAt(0) === "$" ? "" : path;
            operation = path.charAt(0) === "$" && operation === undefined
                ? path
                : operation;
        });
    } else {
        operation = key.split(".")[0];
    }

    const tail = key.split(".").filter(path =>
        !name.split(".").includes(path) && path !== operation
    );
    
    const param = {
        name,
        operation,
        param: key === ""
            ? val
            : generateCalculation(key.split(".").slice(2).join("."), val, call + 1)
    };

    if (param.param.operation === "") param.param = param.param.param;
    return param;
}

const siftObject = obj => {
    const flatObj = destructure(obj);
    const groupBy = [];
    const calculations = [];

    Object.entries(flatObj).forEach(entry => {
        const [ key, val ] = entry;
        
        if (aggregations.isFunctional(key)) {
            calculations.push( generateCalculation(key, val) );
        } else {
            groupBy.push({ name: key, path: val });
        }
    });
    
    return { groupBy, calculations };
}

const hashContents = arr => arr.map(elem => elem).join("")

const destructure = (obj, path = null) => {
    let retObj = {};
    const entries = Object.entries(obj);

    entries.forEach(entry => {
        const [ key, val ] = entry;
        const currentPath = path ? path + "." + key : key;
        const subEntries = typeOf(val) === "Object" ? destructure(val, currentPath) : null;
        retObj = subEntries ? { ...retObj, ...subEntries } : { ...retObj, [currentPath]: val };
    });

    return retObj;
}

const aggregations = {
    functions: [ "$sum", "$avg" ],

    isFunctional(path) {
        return path.split(".")
            .reduce(
                (accum, val) => accum || aggregations.functions.includes(val),
                false
            );
    },

    $sum(group, param) {
        let reducedValue = 0;
        group.forEach(item => {
            if (typeOf(param) === "Number") {
                reducedValue += param;
            } else if (typeOf(param) === "Array") {
                reducedValue += param.map(_path => resolvePathAndGet(item, _path))
                    .reduce((accum, val) => accum + val);
            } else if (typeOf(param) === "Object") {
                reducedValue += aggregations[param.operation]([ item ], param.param);
            }
        });

        return reducedValue;
    },

    $avg(group, param) {
        let reducedValue;
        let counter = 0;
        group.forEach(item => {
            if (typeOf(param) === "Number") {
                reducedValue = param;
                counter++;
            } else if (typeOf(param) === "Array") {
                reducedValue = param.map(_path => resolvePathAndGet(item, _path))
                    .reduce((accum, val) => accum + val);
                counter = param.length;
            } else if (typeOf(param) === "Object") {
                reducedValue += aggregations[param.operation](group, param.param);
                counter = group.length;
            }
        });

        return reducedValue / counter;
    }
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

    group(obj = {}) {
        const groups = new Map();
        let fodder = [ ...this ];
        const { groupBy, calculations } = siftObject(obj);
        
        for (const fodderItem of fodder) {
            const valuesToMatch = groupBy.map(condition =>
                resolvePathAndGet(fodderItem, condition.path)
            );
			const hashedValues = hashContents(valuesToMatch);
            groups.has(hashedValues)
                ? groups.set(hashedValues, [ ...groups.get(hashedValues), fodderItem ])
                : groups.set(hashedValues, [ fodderItem ]);
		}

        return Array.from(groups).map(_group => {
            const group = _group[1];
            const consolidatedObj = consolidateObj(group, groupBy);

            calculations.forEach(calculation => {
                const { name, operation, param } = calculation
                consolidatedObj[name] = aggregations[operation](group, param);
            });

            return consolidatedObj;
        });
    }

    aggregate({ pipeline = [] } = {}) {
        let retObj = {};

        pipeline.forEach(stage => {
            if (Object.keys(stage)[0] === "$group") {
                const fieldsArr = Object.keys(stage.$group);

                fieldsArr.forEach(field => {
                    const action = Object.keys(stage.$group[field]);
                    if (action === "$sum") {
                        // retObj[field] = 
                    }
                })
            }
        })
    }

    movingAverage({ chunk, type, field = "$data" } = {}) {
        if (![ MV_AVG_CENTER, MV_AVG_LEAD, MV_AVG_TRAIL ].includes(type)) {
            return this;
        }

        const retObj = [];
        let begin, end;

        if (type === MV_AVG_CENTER) {
            begin = Math.floor(chunk / 2);
            end = this.length - begin - (chunk % 2 === 0 ? 0 : 1);
            console.log(begin, end);
        } else if (type === MV_AVG_LEAD) {
            begin = 0;
            end = this.length - chunk;
        } else {
            begin = chunk - 1;
            end = this.length - 1
        }

        for (let n = 0; n < this.length; n++) {
            if (n < begin || n > end) {
                retObj.push(null);
                continue;
            }

            const range = {};
            if (type === MV_AVG_CENTER) {
                range.begin = n - Math.floor(chunk / 2);
                range.end = n + Math.floor(chunk / 2) - (chunk % 2 === 0 ? 1 : 0) + 1;
            } else if (type === MV_AVG_LEAD) {
                range.begin = n;
                range.end = n + chunk - 1 + 1;
            } else {
                range.begin = n - chunk + 1
                range.end = n + 1;
            }

            console.log(this.slice(range));
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