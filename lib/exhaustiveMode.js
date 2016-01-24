/**
 * Exhaustive implementation for selecting a random beer: fetches all beers and chooses one randomly, fetching at most once per day.
 */
var request = require('request');
var moment = require('moment');
var request = require('request');
var querystring = require('querystring');
var _ = require('lodash');;

var config = require('../config/app-config.json');
var storage = require('../lib/storage');
var lcboUtil = require('../lib/lcboUtil');
var beerUtil = require('../lib/beerUtil');

var BEERS_STORAGE = config.storage_beers;

/**
 * Generic callback function
 * @callback errorFirstCallback
 * @param {Object} error (Optional) error
 * @param {Object} data Data to be bubbled up (if no error)
 */

/**
 * Get all beers listed at a given store
 * @param {errorFirstCallback} callback Callback function passing either an error or an array of beers
 */
var getBeers = function (callback) {
    console.log('--- Get beers - exhaustive mode ---');
    // Only load the full product list once per day
    var m = moment(storage.getLastModifiedDate(BEERS_STORAGE));
    var today = moment().hour(0).minute(0).second(0).millisecond(0);

    if (m.isBefore(today)) {
        console.log('Fetching from LCBO');
        fetchBeers(config.store_id, function (error, beers) {
            if (error) {
                callback(error, null);
            }
            else {
                cacheBeers(beers);
                callback(null, beers);
            }
        });
    }
    else {
        console.log('Fetching from LCBO');
        loadBeersFromCache(function (error, beers) {
            if (error) {
                callback(error, null);
            }
            else {
                // Check for empty cache first
                if (beers.length === 0) {
                    console.log('Cache empty, fetching from LCBO');
                    fetchBeers(config.store_id, function (error, beers) {
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            cacheBeers(beers);
                            callback(null, beers);
                        }
                    });
                }
                else {
                    callback(null, beers);
                }
            }
        });
    }
};

/**
 * Fetch all beers listed at a given store from the LCBO API
 * @param {string} storeId The ID of the store to fetch from
 * @param {errorFirstCallback} callback Callback function passing either an error or an array of beers
 */
var fetchBeers = function (storeId, callback) {
    var query = {
        per_page: config.max_results_per_page,
        store_id: storeId,
        where_not: 'is_dead,is_discontinued'
    };

    var beers = [];
    var pageNum = 1;
    var totalPages = 0;

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

    var getNextPage = function (callback) {
        pageNum++;
        var serviceURL = config.api_url + config.api_path_products + '?' + querystring.stringify(query) + '&page=' + pageNum;
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

            if (totalPages > 1) {
                getNextPage(nextPageCallback);
            }
            else {
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
            callback(null, beers);
        }
    }
};

/**
 * Store an array of beers
 * @param {Array.<Object>} beers Array of beers to store
 * @param {function} callback Callback function passing an optional error object
 */
var cacheBeers = function (beers, callback) {
    storage.store(BEERS_STORAGE, JSON.stringify(beers), callback);
};

/**
 * Fetch master beer list from cache
 * @param {errorFirstCallback} callback Callback function passing either an error object or a list of beers
 */
var loadBeersFromCache = function (callback) {
    storage.read(BEERS_STORAGE, function (error, data) {
        if (error) {
            callback(error, null);
        }
        else {
            var beers;
            try {
                beers = JSON.parse(data);
                callback(null, beers);
            }
            catch (e) {
                callback(null, []);
            }
        }
    });
};

/**
 * Get next random beer from list of all beers, excluding already taken ones
 * @param {errorFirstCallback} callback Callback function passing either an error object or a beer object
 */
var getNextBeer = function (callback) {
    console.log('--- Get next beer - exhaustive mode ---');
    getBeers(function (error, beers) {
        if (error) {
            callback(error, null);
        }
        else {
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

                    beerUtil.chooseBeer(beers, callback);
                }
            });
        }
    });
};

module.exports.getBeers = getBeers;
module.exports.getNextBeer = getNextBeer;