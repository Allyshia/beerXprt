/**
 * Utilities for fetching data from the LCBO API
 */
var request = require('request');

var config = require('../config/app-config.json');

/**
 * Check inventory for a given store, for a given product
 *
 * @param {string} storeId Id of the store to check
 * @param {string} productId Id of the product to check for
 * @param {function} callback Callback function passing an optional error object and a boolean value (true if the product is in inventory at that store)
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
 * Get a particular product page from a store's product list from the LCBO API.
 * @param {string} storeId Store ID to get from
 * @param {number} pageNum Page number to get
 * @param {function} callback Callback function passing an optional error, a response object, and a body string
 */
var getProductPage = function(storeId, pageNum, callback) {
    var serviceURL = config.api_url + config.api_path_products + '?store_id=' + storeId + '&page=' + pageNum;
    console.log('Getting product page: ' + serviceURL);
    request.get({
        url: serviceURL,
        headers: {
            'Authorization': 'Token ' + config.api_key
        }
    }, callback);
};

module.exports.checkInventory = checkInventory;
module.exports.getProductPage = getProductPage;