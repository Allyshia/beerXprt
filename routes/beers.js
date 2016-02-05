/**
 * Beers resource
 */

var express = require('express');
var router = express.Router();
var _ = require('lodash');
var url = require('url');
var util = require('util');

var config = require('../config/app-config.json');
var beerUtil = require('../lib/beerUtil');
var exhaustiveMode = require('../lib/exhaustiveMode');
var efficientMode = require('../lib/efficientMode');

var lcboUtil = require('../lib/lcboUtil');

var selectedMode = config.efficiency_mode ? efficientMode : exhaustiveMode;

/**
 * GET all beers
 */
router.get('/', function (req, res) {
    exhaustiveMode.getBeers(function (error, beers) {
        if (error) {
            var errorObj = handleError(error, 'Error getting beers', 500);
            res.status(500).send(errorObj);
        }
        else {
            res.json({beers: beers});
        }
    });
});

/**
 * GET next beer
 */
router.get('/next', function (req, res) {
    selectedMode.getNextBeer(function (error, beer) {
        if (error) {
            var errorObj = handleError(error, 'Error getting next beer', 500);
            res.status(500).send(errorObj);
        }
        else if (beer === null) {
            var errorObj = handleError(null, 'There are no beers left to choose from.', 404);
            res.status(404).send(errorObj);
        }
        else {
            res.json({beer: beer});
        }
    });
});

/**
 * GET used beers
 * * Optional query parameter: last (number of "latest" used beers to return)
 */
router.get('/used', function (req, res) {
    var last = -1;
    var errorObj;

    console.log(JSON.stringify(req.query));
    if (req.query.last) {
        // Validate 'last' parameter
        if (isNaN(req.query.last) || req.query.last < 1) {
            errorObj = handleError(null, 'Max must be an integer greater than 1.', 500);
            res.status(400).send(errorObj);
        }
    }

    if (!errorObj) {
        last = req.query.last;

        beerUtil.getUsedBeers(function (error, beers) {
            if (error) {
                errorObj = handleError(error, 'Could not get used beers.', 500);
                res.status(500).send(errorObj);
            }
            else {
                var beerResponse = [];
                if(beers.length == 0){
                    res.json({beers: beers});
                }
                else
                {
                    for(var i in beers)
                    {
                        lcboUtil.getProductById(beers[i], function(error, response, body){
                            var result = JSON.parse(body).result;
                            beerResponse.push(result);

                            if(i == beers.length - 1){
                                res.json({beers: beerResponse});
                            }
                        });
                    }
                }
            }
        }, last);
    }
});

/**
 * DELETE all used beers (reset)
 */
router.delete('/used', function (req, res) {
    beerUtil.deleteAllUsed(function (error) {
        if (error) {
            var errorObj = handleError(error, 'Could not delete used beers.', 500);
            res.status(500).send(errorObj);
        }
        else {
            res.sendStatus(200);
        }
    });
});

var handleError = function (error, msg, errorCode) {
    console.log(msg + util.inspect(error) + '; errorCode: ' + errorCode);
    return {'error': msg + ': ' + util.inspect(error)};
};

module.exports = router;