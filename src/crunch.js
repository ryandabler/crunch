////////////////////
// Initialize
////////////////////
const constants = require("./constants");
const aggregations = require("./aggregations");
const {
    typeOf,
    isIterable,
    objectify,
    consolidateObj,
    resolvePathAndGet,
    resolvePathAndSet,
    generateCalculation,
    mergeObjects,
    siftObject,
    hashContents,
    destructure
} = require("./utilities");

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

        return crunch(
            Array.from(groups).map(_group => {
                const group = _group[1];
                const consolidatedObj = consolidateObj(group[0], groupBy);

                calculations.forEach(calculation => {
                    const { name, operation, param } = calculation
                    consolidatedObj[name] = aggregations[operation](group, param);
                });

                return consolidatedObj;
            })
        );
    }

    movingAverage({ chunk, type, field = "$data" } = {}) {
        if (![ constants.MV_AVG_CENTER, constants.MV_AVG_LEAD, constants.MV_AVG_TRAIL ].includes(type)) {
            return this;
        }

        const retArr = [];
        let begin, end;

        if (type === constants.MV_AVG_CENTER) {
            begin = Math.floor(chunk / 2);
            end = this.length - begin - (chunk % 2 === 0 ? 0 : 1);
        } else if (type === constants.MV_AVG_LEAD) {
            begin = 0;
            end = this.length - chunk;
        } else {
            begin = chunk - 1;
            end = this.length - 1
        }

        for (let n = 0; n < this.length; n++) {
            if (n < begin || n > end) {
                retArr.push(null);
                continue;
            }

            const range = {};
            if (type === constants.MV_AVG_CENTER) {
                range.begin = n - Math.floor(chunk / 2);
                range.end = n + Math.floor(chunk / 2) - (chunk % 2 === 0 ? 1 : 0) + 1;
            } else if (type === constants.MV_AVG_LEAD) {
                range.begin = n;
                range.end = n + chunk - 1 + 1;
            } else {
                range.begin = n - chunk + 1
                range.end = n + 1;
            }

            retArr.push( this.slice(range).group({avg: {$avg: field}}).data()[0].avg );
        }

        return retArr;
    }
}

const crunch = data => 
    isIterable(data) ? new Crunch(objectify(data)) : new Crunch([])

crunch.uniformDist = (begin = -1, end = 1) => {
    return (end - begin) * Math.random() + begin;
}

crunch.normalDist = (mean, std) => {
    let s = 0;
    let u, v;

    while (s === 0 || s >= 1) {
        [ u, v ] = [ Crunch.uniformDist(), Crunch.uniformDist() ];
        s = u ** 2 + v ** 2;
    }

    const [ z0, z1 ] = [ u * Math.sqrt(-2 * Math.log(s) / s), null ];
    return z0 * std + mean;
}

crunch.round = (number, places) => {
    return Math.round(number * 10 ** places) / 10 ** places;
}

crunch.isPrime = number => {
    const upperLimit = Math.ceil(Math.sqrt(number));
    for (let n = 2; n <= upperLimit; n++) {
        if (number % n === 0) return false;
    }

    return true;
}

crunch.eval = expr => {
    return Function(`"use strict"; return ${expr};`)();
}

module.exports = { Crunch, crunch };