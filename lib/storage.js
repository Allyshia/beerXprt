/**
 * Local storage utility
 **/

var fs = require('fs');
var util = require('util');

var STORAGE_DIR = 'storage/';

/**
 * Append a string to an existing file
 * @param filename File to which the string should be appended
 * @param str String to append
 * @param callback Callback function passing an optional error object
 */
var store = function (filename, str, callback) {
    fs.appendFile(STORAGE_DIR + filename, str + '\n', 'utf8', callback);
};

/**
 * Clear all content from an existing file
 * @param filename File to clear
 * @param callback Callback function passing an optional error object
 */
var clear = function(filename, callback){
    fs.writeFile(STORAGE_DIR + filename, '', 'utf8', callback);
};

/**
 * Read contents of a file into an object
 * @param filename The file to read
 * @param callback Callback function passing an optional error object and a data object
 */
var read = function (filename, callback) {
    fs.readFile(STORAGE_DIR + filename, 'utf8', callback);
};

/**
 * Read contents of a file line by line into an array
 * @param filename The file to read
 * @param callback Callback function passing an optional error object and an array of strings representing the lines from the file
 */
var readLines = function (filename, callback) {
    read(filename, function (error, data) {
        if (error) {
            callback(error, null);
        }
        else {
            callback(null, data.trim().split('\n'));
        }
    });
};

/**
 * Check whether a file exists
 * @param filename The file to check for
 * @returns {boolean} true if the file exists, false otherwise
 */
var fileExists = function (filename) {
    try {
        var stats = fs.statSync(filename);
        return stats.isFile();
    }
    catch (e) {
        return false;
    }
};

module.exports.store = store;
module.exports.clear = clear;
module.exports.read = read;
module.exports.readLines = readLines;
module.exports.fileExists = fileExists;