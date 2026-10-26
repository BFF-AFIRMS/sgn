import test from 'tape';
import nock from 'nock';
import * as Boxplotter from '../source/entries/boxplotter.js';
import data from './boxplotter.test.data.js';

// Mock SVGElement.prototype.getBBox in the JSDOM test environment
if (typeof SVGElement !== 'undefined' && !SVGElement.prototype.getBBox) {
    SVGElement.prototype.getBBox = function () {
        return { x: 0, y: 0, width: 0, height: 0 };
    };
}

test('Boxplot', t=>{

    document.querySelector('body').innerHTML = `<div id="bxplt"></div>`;

    var boxplotter;

    t.test("initialize", t=>{
        t.plan(1);
        t.doesNotThrow(()=>{
            boxplotter = Boxplotter.init("#bxplt");
        })
    });

    t.test("populate", t=>{
        t.plan(2);

        var scope = nock(document.location.origin);
        scope.get('/ajax/tools/boxplotter/get_constraints').query({dataset: 7})
            .reply(200, data.constraints);
        scope.post('/brapi/v2/search/observationunits')
            .reply(200, {
                metadata: {},
                result: {
                    searchResultsDbId: "test_search_id"
                }
            });
        scope.get('/brapi/v2/search/observationunits/test_search_id')
            .query(true)
            .reply(200, data.phenotypes);

        const start = Date.now();
        const checkInterval = setInterval(() => {
            if (scope.isDone() || Date.now() - start >= 1500) {
                clearInterval(checkInterval);
                t.ok(scope.isDone(), "expected calls made");
            }
        }, 50);

        t.doesNotThrow(()=>{
            boxplotter.loadDatasetObsUnits(7,"plot");
        },"loadDatasetObsUnits works");
    });
});
