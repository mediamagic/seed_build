'use strict'; 

angular.module('application', ['ngResource', 'ngCookies', 'ui'])

.config(['$routeProvider'
        , '$locationProvider'
        , function($routeProvider, $locationProvider) {
	$routeProvider
		.when('/main',  { templateUrl: '/views/Main.html'
                        , controller: MainCtrl, name:'Main' })
		.when('/login', { templateUrl: '/views/Login.html'
                        , controller: LoginCtrl, name: 'Login' })
		.otherwise(     { redirectTo: '/main' })
}])