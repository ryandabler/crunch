////////////////////
// Initialize
////////////////////
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
    destructure,
    isFunctional
} = require("./utilities");
const constants = require("./constants");

////////////////////
// Main
////////////////////
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
const $sum = (group, param) => {
    let reducedValue = 0;
    group.forEach(item => {
        if (typeOf(param) === constants.TYPE_NUMBER) {
            reducedValue += param;
        } else if (typeOf(param) === constants.TYPE_ARRAY) {
            reducedValue += param.map(_path => resolvePathAndGet(item, _path))
                .reduce((accum, val) => accum + val);
        } else if (typeOf(param) === constants.TYPE_OBJECT) {
            reducedValue += aggregations[param.operation]([ item ], param.param);
        } else if (typeOf(param) === constants.TYPE_STRING) {
            reducedValue += resolvePathAndGet(item, param);
        }
    });

    return reducedValue;
}

/**
 * Multiplies values in a series of documents.
 * 
 * Depending on the type of the param, different behavior is done.
 * If param is a:
 *     number, it merely gets multiplied to reducedValue and returned.
 *     array, the whole array is a list of paths to values that are multiplied.
 *     object, it is multiplying the output of another operation.
 * 
 * @param {Array} group 
 * @param {*} param 
 * @returns {number}
 */
const $multiply = (group, param) => {
    let reducedValue = 1;
    group.forEach(item => {
        if (typeOf(param) === constants.TYPE_NUMBER) {
            reducedValue *= param;
        } else if (typeOf(param) === constants.TYPE_ARRAY) {
            reducedValue *= param.map(_path => resolvePathAndGet(item, _path))
                .reduce((accum, val) => accum * val);
        } else if (typeOf(param) === constants.TYPE_OBJECT) {
            reducedValue *= aggregations[param.operation]([ item ], param.param);
        } else if (typeOf(param) === constants.TYPE_STRING) {
            reducedValue += resolvePathAndGet(item, param);
        }
    });

    return reducedValue;
}

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
const $avg = (group, param) => {
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
            //TODO: is this right? Should we do counter++?
            counter = group.length;
        } else if (typeOf(param) === constants.TYPE_STRING) {
            reducedValue += resolvePathAndGet(item, param);
            counter++;
        }
    });

    return reducedValue / counter;
}

const aggregations = {
    $sum,
    $avg
}

module.exports = {
    $sum,
    $avg
};