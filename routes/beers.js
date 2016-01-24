/**
 * Beers resource
 */

var express = require('express');
var router = express.Router();

var config = require('../config/app-config.json');
var request = require('request');
var querystring = require('querystring');
var _ = require('lodash');
var url = require('url');

var storage = require('../lib/storage');
var baseURL = '/products';
var USED_BEERS_STORAGE = 'usedBeers.txt';

/**
 * GET all beers
 */
router.get('/', function (req, res) {
    getBeers(function (error, beers) {
        if (error) {
            console.log("error getting beers: " + error);
            res.status(500).send(error);
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
    getNextBeer(function (error, beer) {
        if (error) {
            console.log("error getting next beer: " + error);
            res.status(500).send(error);
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
    deleteAllUsed(function (error) {
        if (error) {
            res.status(500).send(error);
        }
        else {
            res.sendStatus(200);
        }
    });
});

/**
 * Generic callback function
 * @callback errorFirstCallback
 * @param {Object} error (Optional) error
 * @param {Object} data Data to be bubbled up (if no error)
 */

/**
 * Get all products listed at a given store
 * @param {errorFirstCallback} callback Callback function passing either an error or an array of beers
 */
var getBeers = function (callback) {
    var obj = {
        val: "get the beers from lcbo",
        key: config.api_key
    };

    var query = {
        per_page: config.max_results_per_page,
        store_id: config.store_id
        //where_not: 'is_dead,is_discontinued'
    };

    var beers = [];
    var pageNum = 1;
    var totalPages = 0;

    var getFirstPage = function (callback) {
        var serviceURL = config.api_url + baseURL + '?' + querystring.stringify(query);
        console.log("getting first page: " + serviceURL);
        request.get({
            url: serviceURL,
            headers: {
                'Authorization': 'Token ' + config.api_key
            }
        }, callback);
    };

    var getNextPage = function (callback) {
        pageNum++;
        //console.log("getting page: " + pageNum);
        var serviceURL = config.api_url + baseURL + '?' + querystring.stringify(query) + '&page=' + pageNum;
        //console.log("getting page: " + serviceURL);
        request.get({
            url: serviceURL,
            headers: {
                'Authorization': 'Token ' + config.api_key
            }
        }, callback);
    };

    getFirstPage(function (error, response, body) {
        if (error) {
            callback(error, null)
        } else if (body) {
            var json = JSON.parse(body);
            var results = json.result ? json.result : [];

            totalPages = json.pager ? json.pager.total_pages : 0;

            beers = beers.concat(_.filter(results, function (item) {
                return item.primary_category === 'Beer'
            }));

            if (totalPages > 1)
            {
                getNextPage(nextPageCallback);
            }
            else {
                console.log("ONLY ONE PAGE");
                callback(null, beers);
            }
        } else {
            callback('Could not do stuff, no body', null);
        }
    });

    var nextPageCallback = function (error, response, body) {
        var json = JSON.parse(body);
        var results = json.result ? json.result : [];

        beers = beers.concat(_.filter(results, function (item) {
            return item.primary_category === 'Beer'
        }));

        if (pageNum < totalPages) {
            getNextPage(nextPageCallback);
        }
        else {
            console.log("CALLING BACK WITH : " + beers.length);
            callback(null, beers);
        }
    }
};

/**
 * Get next random beer based on all beers and list of already taken ones
 * @param {errorFirstCallback} callback Callback function passing either an error object or a beer object
 */
var getNextBeer = function (callback) {
    getBeers(function (error, beers) {
        console.log("JUST GOT BEERS: " + beers.length);
        if (error) {
            callback(error, null);
        }
        else {
            readUsedBeers(function (usedErr, usedData) {
                if (usedErr) {
                    callback(usedErr, null);
                }
                else {
                    for (var i in usedData) {
                        _.remove(beers, function (item) {
                            if (item.id == usedData[i]) {
                                console.log("removing: " + item.id);
                            }
                            return item.id == usedData[i];
                        });
                    }
                    console.log("NUM BEERS AFTER REMOVAL : " + beers.length);
                    var choice = Math.floor(Math.random() * beers.length);
                    console.log("choice :" + choice);

                    var chosen = beers[choice];

                    // Save used beer -- TODO allow skip
                    saveBeer(chosen.id, function (saveErr) {
                        if (saveErr) {
                            callback(saveErr, null);
                        }
                        else {
                            callback(null, chosen);
                        }
                    });
                }
            });
        }
    });
};

/**
 * Store the ID of a beer that's already been chosen
 * @param {string} id Id of the beer to save to the 'used' beers file
 * @param {errorFirstCallback} callback Callback function passing an optional error object
 */
var saveBeer = function (id, callback) {
    storage.store(USED_BEERS_STORAGE, id, callback);
};

/**
 * Read list of already chosen beers
 * @param {errorFirstCallback} callback Callback function passing either an error object or the list of used beers
 */
var readUsedBeers = function (callback) {
    //if(!storage.fileExists(USED_BEERS_STORAGE)){ // TODO
    //    callback(null, []);
    //}

    storage.readLines(USED_BEERS_STORAGE, callback);
};

/**
 * Clear all chosen beers from the list
 * @param {errorFirstCallback} callback Callback function passing either an optional error object
 */
var deleteAllUsed = function(callback){
    storage.clear(USED_BEERS_STORAGE, callback);
};

module.exports = router;

// TODO potential value-add: prioritize seasonal or on sale