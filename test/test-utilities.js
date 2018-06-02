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

    describe("isIterable()", function() {
        it("Should return true", function() {
            const objectsToTest = [
                [1, 2, 3],
                new Map(),
                "Hello",
            ];
            const results = objectsToTest.map(isIterable);

            results.forEach(result => {
                expect(result).to.be.true;
            });
        });

        it("Should return false", function() {
            const objectsToTest = [
                1,
                {a: 1},
                () => {},
            ];
            const results = objectsToTest.map(isIterable);

            results.forEach(result => {
                expect(result).to.be.false;
            });
        });
    });

    describe("objectify()", function() {
        it("Should do nothing if given a TYPE_OBJECT", function() {
            const objectsToTest = [
                [{a: 1}, {b: 2}]
            ];
            const results = objectsToTest.map(objectify);

            results.forEach((result, idx) => {
                expect(result).to.deep.equal(objectsToTest[idx]);
            });
        });

        it("Should convert contents to { $data: ... } if not given TYPE_OBJECT", function() {
            const objectsToTest = [
                [1, 2],
                "abc"
            ];
            const results = objectsToTest.map(objectify);
            const answers = [
                [{ $data: 1 }, { $data: 2 }],
                [{ $data: "a" }, { $data: "b" }, { $data: "c" }]
            ]
            results.forEach((result, idx) => {
                expect(result).to.deep.equal(answers[idx]);
            });
        });
    });

    describe("consolidateObj()", function() {
        it("Should extract values from an object into a new one", function() {
            const template = { a: { b: 1, c: 2}, d: 3, e: { f: { g: [ 1, 2 ] } } };
            const conditions = [
                { path: "a.c", name: "ac" },
                { path: "d", name: "d.e" },
                { path: "e.f.g.1", name: "efg1" }
            ];
            const result = consolidateObj(template, conditions);
            const answer = {
                ac: 2,
                d: { e: 3 },
                efg1: 2
            };

            expect(result).to.deep.equal(answer);
        });
    });
});