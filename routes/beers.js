/**
 * Beers resource
 */

var express = require('express');
var router = express.Router();
var request = require('request');
var querystring = require('querystring');
var _ = require('lodash');
var url = require('url');
var moment = require('moment');

var config = require('../config/app-config.json');
var storage = require('../lib/storage');

var BEERS_STORAGE = config.storage_beers;
var USED_BEERS_STORAGE = config.storage_used_beers;

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
        else if (beer === null) {
            res.status(404).json({error: "There are no beers left to choose from."});
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
 * Get all beers listed at a given store
 * @param {errorFirstCallback} callback Callback function passing either an error or an array of beers
 */
var getBeers = function (callback) {
    // Only load the full product list once per day
    var m = moment(storage.getLastModifiedDate(BEERS_STORAGE));
    var today = moment().hour(0).minute(0).second(0).millisecond(0);

    if (m.isBefore(today)) {
        fetchBeers(function (error, beers) {
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
        loadBeersFromCache(function (error, beers) {
            if (error) {
                callback(error, null);
            }
            else {
                // Check for empty cache first
                if (beers.length === 0) {
                    fetchBeers(function (error, beers) {
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
 * @param {errorFirstCallback} callback Callback function passing either an error or an array of beers
 */
var fetchBeers = function (callback) {
    var obj = {
        val: "get the beers from lcbo",
        key: config.api_key
    };

    var query = {
        per_page: config.max_results_per_page,
        store_id: config.store_id,
        where_not: 'is_dead,is_discontinued'
    };

    var beers = [];
    var pageNum = 1;
    var totalPages = 0;

    var getFirstPage = function (callback) {
        var serviceURL = config.api_url + config.api_path_products + '?' + querystring.stringify(query);
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
        var serviceURL = config.api_url + config.api_path_products + '?' + querystring.stringify(query) + '&page=' + pageNum;
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
            console.log("CALLING BACK WITH : " + beers.length);
            callback(null, beers);
        }
    }
};

/**
 * Store an array of beers
 * @param beers Array of beers to store
 * @param {errorFirstCallback} callback Callback function passing an optional error object
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
            getUsedBeers(function (usedErr, usedData) {
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

                    chooseBeer(beers, callback);
                }
            });
        }
    });
};

/**
 * Choose the next beer at random from the list of pre-processed never-before selected beers - keep selecting until we hit a beer that is in inventory
 * @param beers List of pre-processed beers with the already-chosen beers removed
 * @param callback Callback function that passes an optional error object and the selected beer
 */
var chooseBeer = function (beers, callback) {
    if (beers.length === 0) {
        callback(null, null);
    }
    else {
        var choice = Math.floor(Math.random() * beers.length);
        console.log("choice :" + choice);

        var chosen = beers[choice];

        checkInventory(config.store_id, chosen.id, function (error, isInInventory) {
            if (error) {
                callback(error, null);
            }
            else {
                if (isInInventory) {
                    // Save used beer -- TODO allow skip
                    saveUsedBeer(chosen.id, function (saveErr) {
                        if (saveErr) {
                            callback(saveErr, null);
                        }
                        else {
                            callback(null, chosen);
                        }
                    });
                }
                else {
                    // Try again
                    _.remove(beers, function (item) {
                        if (item.id === chosen.id) {
                            console.log("removing because of lack of inventory: " + item.id);
                        }
                        return item.id === chosen.id;
                    });
                    chooseBeer(beers, callback);
                }
            }
        });
    }
};

/**
 * Check inventory for a particular store, for a particular product
 *
 * @param storeId Id of the store to check
 * @param productId Id of the product to check for
 * @param callback Callback function passing an optional error object and a boolean value (true if the product is in inventory at that store)
 */
var checkInventory = function (storeId, productId, callback) {
    var serviceURL = config.api_url + config.api_path_stores + '/' + storeId + config.api_path_products + '/' + productId + config.api_path_inventory;
    request.get({
        url: serviceURL,
        headers: {
            'Authorization': 'Token ' + config.api_key
        }
    }, function (error, response, body) {
        if (error) {
            callback(error, null);
        }
        else {
            try {
                var json = JSON.parse(body);
                if(json.result.quantity === 0){
                    callback(null, false);
                }
                else{
                    callback(null, true);
                }
            }
            catch (e) {
                callback(e, null);
            }
        }
    });
};

/**
 * Store the ID of a beer that's already been chosen
 * @param {string} id Id of the beer to save to the 'used' beers file
 * @param {errorFirstCallback} callback Callback function passing an optional error object
 */
var saveUsedBeer = function (id, callback) {
    getUsedBeers(function (error, data) {
        if (error) {
            // If error getting used beers, just override
            storage.store(USED_BEERS_STORAGE, JSON.stringify([id]), callback);
        }
        else {
            data.push(id);
            storage.store(USED_BEERS_STORAGE, JSON.stringify(data), callback);
        }
    });
};

/**
 * Read list of already chosen beers
 * @param {errorFirstCallback} callback Callback function passing either an error object or the list of used beers
 */
var getUsedBeers = function (callback) {
    //if(!storage.fileExists(USED_BEERS_STORAGE)){ // TODO
    //    callback(null, []);
    //}

    storage.read(USED_BEERS_STORAGE, function (error, data) {
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
 * Clear all chosen beers from the stored list
 * @param {errorFirstCallback} callback Callback function passing either an optional error object
 */
var deleteAllUsed = function (callback) {
    storage.clear(USED_BEERS_STORAGE, callback);
};

module.exports = router;