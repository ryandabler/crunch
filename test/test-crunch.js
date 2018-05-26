////////////////////////////
// Initialize
////////////////////////////
const chai  = require("chai");
const mocha = require("mocha");

const { crunch, Crunch } = require("../src/crunch");

const expect = chai.expect;

////////////////////////////
// Test
////////////////////////////
describe("Crunch", function() {
    describe(".data()", function() {
        it("Should return data as an array", function() {
            expect(1).to.equal(2);
        });
    });

    describe(".slice()", function() {
        it("Should return entire dataset if no parameters supplied", function() {
            expect(1).to.equal(2);
        });

        it("Should supply missing parameter if the other is supplied", function() {
            expect(1).to.equal(2);
        });

        it("Should return dataset between given indices", function() {
            expect(1).to.equal(2);
        });
    });

    describe.only(".group()", function() {
        let dataset;

        beforeEach(function() {
            dataset = crunch([
                {
                    invoiceId: "A1",
                    date: new Date(2018, 04, 23),
                    vendor: "Vendor 1",
                    quantity: 200,
                    price: 30,
                    item: {
                        name: "Item A",
                        discount: "Clearance"
                    }
                },
                {
                    invoiceId: "B2",
                    date: new Date(2018, 04, 24),
                    vendor: "Vendor 2",
                    quantity: 5,
                    price: 6.4,
                    item: {
                        name: "Item B",
                        discount: "None"
                    }
                },
                {
                    invoiceId: "C3",
                    date: new Date(2018, 04, 25),
                    vendor: "Vendor 1",
                    quantity: 7,
                    price: 100,
                    item: {
                        name: "Item A",
                        discount: "None"
                    }
                }
            ]);
        });

        it("Should produce one document if only calculations are supplied", function() {
            const specs = {
                quantity: { $sum: "quantity" },
                price: { $avg: "price"}
            };

            const result = dataset.group(specs);
            expect(result.length).to.equal(1);
        });

        it("Should handle nested calculations", function() {
            const specs = {
                field: { $sum: { $avg: [ "quantity", "price" ] } },
            };

            const result = dataset.group(specs);
            expect(result[0].field).to.equal(
                [ ...dataset ].reduce((accum, doc) => accum + (doc.quantity + doc.price) / 2, 0)
            );
        });

        // TODO: Implement a comparison function to compare two objects and traverse depth
        it("Should mimic structure of object passed in as parameter", function() {
            const specs = {
                quantity: { $sum: "quantity" },
                price: { $avg: "price"},
                item: { discount: "None" }
            };

            const result = dataset.group(specs);
            for (const document of result) {
                for (const key in specs) {
                    expect(key in document).to.be.true;
                }

                for (const key in document) {
                    expect(key in specs).to.be.true;
                }
            };
        });

        it("Should return data an instance of Crunch class", function() {
            const specs = {
                quantity: { $sum: "quantity" },
                price: { $avg: "price"}
            };

            const result = dataset.group(specs);
            expect(result instanceof Crunch).to.be.true;
        });
    });

    describe(".movingAverage()", function() {
        let dataset;

        beforeEach(function() {
            dataset = crunch([
                {
                    quantity: 200
                },
                {
                    quantity: 5
                },
                {
                    quantity: 70
                },
                {
                    quantity: 27
                },
                {
                    quantity: 571
                },
                {
                    quantity: 79
                }
            ]);
        });

        it("Should generate a centered moving average", function() {
            expect(2).to.equal(1);
        });

        it("Should generate a trailing moving average", function() {
            expect(2).to.equal(1);
        });

        it("Should generate a leading moving average", function() {
            expect(2).to.equal(1);
        });
    });
});