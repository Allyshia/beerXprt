/**
 * Utilities around getting beers.
 */

var _ = require('lodash');

var config = require('../config/app-config.json');
var storage = require('../lib/storage');
var lcboUtil = require('../lib/lcboUtil');

var USED_BEERS_STORAGE = config.storage_used_beers;


/**
 * Generic callback function
 * @callback errorFirstCallback
 * @param {Object} error (Optional) error
 * @param {Object} data Data to be bubbled up (if no error)
 */

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
 * Choose the next beer at random from the list of pre-processed never-before selected beers - keep selecting until we hit a beer that is in inventory
 * @param {Array.<Object>} beers List of pre-processed beers with the already-chosen beers removed
 * @param {errorFirstCallback} callback Callback function that passes an optional error object and the selected beer
 */
var chooseBeer = function (beers, callback) {
    if (beers.length === 0) {
        callback(null, null);
    }
    else {
        var choice = Math.floor(Math.random() * beers.length);
        console.log('choice :' + choice);

        var chosen = beers[choice];

        lcboUtil.checkInventory(config.store_id, chosen.id, function (error, isInInventory) {
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
                            console.log('removing because of lack of inventory: ' + item.id);
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
 * Clear all chosen beers from the stored list
 * @param {function} callback Callback function passing an optional error object
 */
var deleteAllUsed = function (callback) {
    storage.clear(USED_BEERS_STORAGE, callback);
};

module.exports.saveUsedBeer = saveUsedBeer;
module.exports.getUsedBeers = getUsedBeers;
module.exports.chooseBeer = chooseBeer;
module.exports.deleteAllUsed = deleteAllUsed;