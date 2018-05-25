////////////////////
// Initialize
////////////////////
const constants = require("./constants");

////////////////////
// Utilities
////////////////////

/**
 * Determines the type of any JavaScript element.
 * 
 * Takes the output from Object.prototype.toString() which is of the form
 * "[object @@@@@]" and returns "@@@@@".
 * 
 * @param {*} obj Item to determine the type of
 * @returns {string}
 */
const typeOf = obj =>
    Object.prototype.toString.call(obj)
        .split(" ")[1]
        .slice(0, -1)

/**
 * Determines whether supplied item is iterable.
 * 
 * @param {*} obj Item to determine iterability for
 * @returns {boolean}
 */
const isIterable = obj =>
    obj ? typeOf(obj[Symbol.iterator]) === constants.TYPE_FUNCTION : false

/**
 * Ensures all elements of an iterable object are objects.
 * 
 * @param {Object} iterable Container whose elements should be converted into objects
 * @returns {Array}
 */
const objectify = iterable => {
    const retObj = []
    for (let elem of iterable) {
        retObj.push(
            typeOf(elem) !== constants.TYPE_OBJECT ? { $data: elem } : elem
        );
    }

    return retObj;
}

/**
 * Generates an object whose values come from the template with details supplied
 * by groupBy.
 * 
 * Each condition in groupBy is converted into an object with the path specified by
 * condition.name and the location of the value in template specified by condition.path.
 * Each object is then merged into an accumulating object that is returned.
 * 
 * @param {Object} template Supplies the values for the final object
 * @param {Array} groupBy Supplies the names and locations of the final object
 * @returns {Object}
 */
const consolidateObj = (template, groupBy) => {
    let retObj = {}

    groupBy.forEach(condition => {
        retObj = mergeObjects(
            retObj,
            resolvePathAndSet(
                resolvePathAndGet(template, condition.path),
                condition.name)
        );
    });

    return retObj;
}

/**
 * Retrieves the value from a nested object given a path.
 * 
 * Iterates over an array containing the path to traverse in obj to find the value.
 * The value of each step in the path should be an object except for the final stage.
 * If any other step is not an object, should return null.
 * 
 * @param {Object} obj Object to retrieve value from
 * @param {string} path Period-separated path to desired value
 * @returns {*}
 */
const resolvePathAndGet = (obj, path) => {
    const segments = path.split(".");
    let pointer = obj;
    const validTypes = [ constants.TYPE_OBJECT, constants.TYPE_ARRAY ];
    
	while (validTypes.includes(typeOf(pointer)) && segments.length > 0) {
		const segment = segments.shift();
		pointer = pointer[segment];
    }
	
    return pointer;
}

/**
 * Creates a nested object whose keys are the specified path, terminating at the value.
 * 
 * @param {*} val Value to be inserted into object
 * @param {string} path Specified path to the value
 * @returns {Object}
 */
const resolvePathAndSet = (val, path) => {
    const retObj = {};
    let pointer = retObj;

    path.split(".").forEach((_path, idx, arr) => {
        pointer[_path] = idx === arr.length - 1 ? val : {};
        pointer = pointer[_path];
    });

    return retObj;
}

/**
 * Generates a calculation object for use in aggregating a collection of documents.
 * 
 * Splits a period-separated path string into segments and, for each segment,
 * determines the operation and the parameter supplied to the operation. The
 * parameter could be another calculation, so this object is filled out
 * recursively.
 * 
 * @param {string} key Path from which to generate the operations
 * @param {*} val Collection of paths to values in the object
 * @param {number} call Recursive depth of the function
 */
// TODO: Rename these parameters to be more descriptive
const generateCalculation = (key, val, call = 1) => {
    let name = "";
    let operation;
    
    // TODO: This could probably be reworked to simplify the logic now that it is only
    // being run once
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

    // If we are on the final operation, param will be another nested { param }
    // object. Move up one level.
    if (param.param.operation === "") param.param = param.param.param;
    return param;
}

/**
 * Merges an object of arbitrary depth into another object.
 * 
 * Traverses the main object, ensuring that the key in subObj is
 * in mainObj, and recursively merging the next layer of each object.
 * When a key is found in subObj that isn't in mainObj, the two 
 * can be safely merged and the merged object is returned.
 * 
 * @param {Object} mainObj Object to have other object merged into
 * @param {Object} subObj Object being merged
 * @returns {Object}
 */
const mergeObjects = (mainObj, subObj) => {
    let retObj = { ...mainObj };
    for (const key in subObj) {
        if (key in mainObj) {
            retObj[key] = mergeObjects(mainObj[key], subObj[key]);
        } else {
            retObj = { ...mainObj, ...subObj };
        }
    }
    return retObj;
}

/**
 * Sorts a nested object into grouping and calculation paths.
 * 
 * Destructures an object and then traverses each element to determine
 * if it is calculation or grouping and adds it to the correct array.
 * Returns an object containing both arrays.
 * 
 * @param {Object} obj
 * @returns {Object}
 */
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

/**
 * Creates a textual representation of the contents of an array.
 * 
 * @param {Array} arr 
 * @returns {Array}
 */
const hashContents = arr => arr.map(elem => elem).join("")

/**
 * Traverses an object and flattens it.
 * 
 * Takes an object of arbitrary nestedness recursively traverses each path to
 * generate a string representation of the path all the way down to the actual
 * value. This path then gets added to a new object as key, with the indicated
 * value as the value.
 * 
 * @param {Object} obj Object to flatten
 * @param {string} [path=null] Path variable to track the recursive depth
 * @returns {Object}
 */
const destructure = (obj, path = null) => {
    let retObj = {};
    const entries = Object.entries(obj);

    entries.forEach(entry => {
        const [ key, val ] = entry;
        const currentPath = path ? path + "." + key : key;
        const subEntries = typeOf(val) === constants.TYPE_OBJECT ? destructure(val, currentPath) : null;
        retObj = subEntries ? { ...retObj, ...subEntries } : { ...retObj, [currentPath]: val };
    });

    return retObj;
}

const aggregations = {
    functions: [ "$sum", "$avg" ],

    /**
     * Determines whether an object path represents a calculation directive.
     * 
     * @param {string} path 
     * @returns {boolean}
     */
    isFunctional(path) {
        return path.split(".")
            .reduce(
                (accum, val) => accum || aggregations.functions.includes(val),
                false
            );
    },

    /**
     * Sums up a series of documents.
     * 
     * Depending on the type of the param, different behavior is done.
     * If param is a:
     *     number, it merely gets added to reducedValue and returned.
     *     array, the whole array is a list of paths to values that are added.
     *     object, it is summing the output of another operation.
     * 
     * @param {Array} group 
     * @param {*} param 
     * @returns {number}
     */
    $sum(group, param) {
        let reducedValue = 0;
        group.forEach(item => {
            if (typeOf(param) === constants.TYPE_NUMBER) {
                reducedValue += param;
            } else if (typeOf(param) === constants.TYPE_ARRAY) {
                reducedValue += param.map(_path => resolvePathAndGet(item, _path))
                    .reduce((accum, val) => accum + val);
            } else if (typeOf(param) === constants.TYPE_OBJECT) {
                reducedValue += aggregations[param.operation]([ item ], param.param);
            }
        });

        return reducedValue;
    },

    /**
     * Averages a series of documents.
     * 
     * Depending on the type of the param, different behavior is done.
     * If param is a:
     *     number, it merely gets added to reducedValue and returned.
     *     array, the whole array is a list of paths to values that are averaged.
     *     object, it is averaging the output of another operation.
     * 
     * @param {Array} group 
     * @param {*} param 
     * @returns {number}
     */
    $avg(group, param) {
        let reducedValue = 0;
        let counter = 0;
        group.forEach(item => {
            if (typeOf(param) === constants.TYPE_NUMBER) {
                reducedValue = param;
                counter++;
            } else if (typeOf(param) === constants.TYPE_ARRAY) {
                reducedValue = param.map(_path => resolvePathAndGet(item, _path))
                    .reduce((accum, val) => accum + val);
                counter = param.length;
            } else if (typeOf(param) === constants.TYPE_OBJECT) {
                reducedValue += aggregations[param.operation]([ item ], param.param);
                counter = group.length;
            } else if (typeOf(param) === constants.TYPE_STRING) {
                reducedValue += resolvePathAndGet(item, param);
                counter++;
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

module.exports = { Crunch, crunch };