app.controller('BeerXprtController', ['$scope', 'BeerXprtService', function ($scope, BeerXprtService) {
    $scope.imgUrl = 'images/rolling.gif';
    $scope.resetMessage = '';

    BeerXprtService.getNextBeer(function (error, beer) {
        if (error) {
            $scope.name = 'No more beers could be found :(';
        }
        else {
            $scope.imgUrl = beer.image_url == null ? 'images/product-img-placeholder.png' : beer.image_url;
            $scope.name = beer.name;
        }
    });

    $scope.resetUsedBeers = function(){
      BeerXprtService.resetUsedBeers(function(error, response){
          if(error){
              $scope.resetMessage = 'Eek. Could not reset :S';
          }
          else{
              $scope.resetMessage = 'All reset!';
          }
      });
    };
}]);