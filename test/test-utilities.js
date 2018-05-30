////////////////////////////
// Initialize
////////////////////////////
const chai  = require("chai");
const mocha = require("mocha");

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
} = require("../src/utilities");
const constants = require("../src/constants");

const expect = chai.expect;

////////////////////////////
// Test
////////////////////////////
describe("Utilities", function() {
    describe("typeOf()", function() {
        it("Should return type of supplied parameter", function() {
            const typesToTest = [
                {a: 1},
                [1, 2, 3],
                1,
                "Hello",
                () => 1
            ];
            const results = typesToTest.map(typeOf);
            const answers = [
                constants.TYPE_OBJECT,
                constants.TYPE_ARRAY,
                constants.TYPE_NUMBER,
                constants.TYPE_STRING,
                constants.TYPE_FUNCTION
            ];

            results.forEach((result, idx) => {
                expect(result).to.equal(answers[idx]);
            });
        });
    });
});