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

var handleError = function(error, msg, errorCode){
    console.log(msg + util.inspect(error) + '; errorCode: ' + errorCode);
    return {'error': msg + ': ' + util.inspect(error)};
};

module.exports = router;