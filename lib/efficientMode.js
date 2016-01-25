/**
 * Efficient implementation for selecting a random beer: chooses only one random page from all products for a given store from which it will select a random beer.
 * Repeat this if page contains no previously unselected beers.
 */
var request = require('request');
var moment = require('moment');
var request = require('request');
var querystring = require('querystring');
var _ = require('lodash');

var config = require('../config/app-config.json');
var lcboUtil = require('../lib/lcboUtil');
var beerUtil = require('../lib/beerUtil');

var failCount = 0;

/**
 * Generic callback function
 * @callback errorFirstCallback
 * @param {Object} error (Optional) error
 * @param {Object} data Data to be bubbled up (if no error)
 */

/**
 * Get next random beer, excluding already taken ones
 * @param {errorFirstCallback} callback Callback function passing either an error object or a beer object
 */
var getNextBeer = function (callback) {
    console.log('--- Get next beer - efficient mode ---');
    var query = {
        per_page: config.max_results_per_page,
        store_id: config.store_id,
        where_not: 'is_dead,is_discontinued'
    };

    var getFirstPage = function (callback) {
        var serviceURL = config.api_url + config.api_path_products + '?' + querystring.stringify(query);
        console.log('getting first page: ' + serviceURL);
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
        } else {
            try {
                var json = JSON.parse(body);
                var totalPages = json.pager ? json.pager.total_pages : 0;

                failCount = 0;
                chooseBeerFromRandomPage(totalPages, callback);
            }
            catch (e) {
                callback(e, null);
            }
        }
    });
};

/**
 * Get a random page to select a random beer; if the page contains no beers that we have not previously chosen, choose another one.
 * @param totalPages
 * @param callback
 */
var chooseBeerFromRandomPage = function (totalPages, callback) {
    if (failCount >= totalPages) {
        // Time to stop
        callback(null, null);
    }

    var randomPageNum = Math.floor(Math.random() * totalPages);

    lcboUtil.getProductPage(config.store_id, randomPageNum, function (erorr, response, body) {
        try {
            var results = JSON.parse(body).result;
            var beers = _.filter(results, function (item) {
                return item.primary_category === 'Beer'
            });
            if (beers.length === 0) {
                // No beers on this page, try again
                console.log('No beers on this page, trying again.');
                chooseBeerFromRandomPage(totalPages, callback);
                failCount++;
            }
            else {
                // Pre-process: remove beers that have been chosen already
                beerUtil.getUsedBeers(function (usedErr, usedData) {
                    if (usedErr) {
                        callback(usedErr, null);
                    }
                    else {
                        for (var i in usedData) {
                            _.remove(beers, function (item) {
                                if (item.id == usedData[i]) {
                                    console.log('removing used: ' + item.id);
                                }
                                return item.id == usedData[i];
                            });
                        }
                        console.log('NUM BEERS AFTER REMOVAL : ' + beers.length);
                        beerUtil.chooseBeer(beers, function (error, chosen) {
                            if (error) {
                                callback(error, null);
                            }
                            else if (chosen === null) {
                                console.log('Chose no beer from this page');
                                // Chose no beer from this page, try another page
                                chooseBeerFromRandomPage(totalPages, callback);
                                failCount++;
                            }
                            else {
                                // We've got a random beer!
                                callback(null, chosen);
                            }
                        });
                    }
                });
            }
        }
        catch (e) {
            callback(e, null);
        }
    });
};

module.exports.getNextBeer = getNextBeer;