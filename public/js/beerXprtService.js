app.service('BeerXprtService', function ($http) {
    this.getBeers = function (callback) {
        $http.get('/beers').then(function (response) {
            callback(null, response.data.beers);
        }, function (error) {
            callback(error, null);
        });
    };

    this.getNextBeer = function (callback) {
        $http.get('/beers/next').then(function (response) {
            callback(null, response.data.beer);
        }, function (error) {
            callback(error, null);
        });
    };

    this.resetUsedBeers = function(callback){
        $http.delete('/beers/used').then(function (response) {
            callback(null, response);
        }, function (error) {
            callback(error, null);
        });
    }
});