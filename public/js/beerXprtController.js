app.controller('BeerXprtController', ['$scope', 'BeerXprtService', function ($scope, BeerXprtService) {
    $scope.imgUrl = 'images/rolling.gif';

    BeerXprtService.getNextBeer(function (error, beer) {
        if (error) {
            $scope.name = "No beers could be found :(";
        }
        else {
            $scope.imgUrl = beer.image_url == null ? 'images/product-img-placeholder.png' : beer.image_url;
            $scope.name = beer.name;
        }
    });
}]);