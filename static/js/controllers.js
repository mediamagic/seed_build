angular.module  ( 'application.controllers', [ 'ngResource','ngCookies', 'ui' ] );

var GlobalCtrl= [ '$scope', '$resource', '$location', '$window', '$cookies', '$http'
					, function ( $scope, $resource, $location, $window, $cookies, $http ) {
}];

var MainCtrl = ['$scope', function ( $scope ) {
}];

var LoginCtrl = ['$scope', '$window' , function ( $scope, $window ){
	var prevUrl = $scope.location.$$search.url;
	$scope.loginSubmit = function (){
		$scope.Login.save(	{}
							, { username: $scope.username
							, password: $scope.password }
							, function(resp){
				if (resp.error === 0){
					$window.location.href = '/admin';
				} 
			});
	}
}];