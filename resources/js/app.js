var config = {};

config.controllers = {
    sayCtrl: [
        '$scope',
        'apiSvc',
        function ($scope, apiSvc) {
            
            var statements = [];
            
            function getStatement(l) {
                apiSvc.getStatement(l, sayStatement);
            }
            function getResponse(l, w) {
                apiSvc.getResponse(l, w, sayStatement);
            }
            function sayStatement(s) {
                statements.push(s);
            }
            
            $scope.statements = statements;
            $scope.getStatement = getStatement;
            $scope.getResponse = getResponse;
        }
    ],
    statCtrl: [
        '$scope',
        'apiSvc',
        function ($scope, apiSvc) {
            var dataRows = [];

            apiSvc.getWordCount(
                function(r) {
                    var result = {title:'Word Count', stats: r.stats};
                    dataRows.push(result);
                }
            );
            
            $scope.dataRows = dataRows;
        }
    ]
};

config.services = {
    apiSvc: [
        '$http',
        function($http) {
            function getStatement(l, callback) {
                $http.get('/say/statement', {params:{targetlength:l}})
                .success(function(data) {callback(data.msg);});
            }
            function getWordCount(callback) {
                $http.get('/info/wordcount')
                .success(callback);
            }
            function getResponse(l, words, callback) {
                var seed = words.split(' ').map(function(w){return w.toLowerCase();});
                $http.get('/say/response', {params:{targetlength:l, seed:seed}})
                .success(function(data){callback(data.msg);});
            }
            this.getStatement = getStatement;
            this.getWordCount = getWordCount;
            this.getResponse = getResponse;
        }
    ]
};

config.directives = {
    wordChart: [
        '$window',
        '$parse',
        function($window, $parse) {

            var Canvas = function (element) {var c = $window.document.createElement('canvas'); element.append(c); return c;},
                Context = function (element) { return Canvas(element).getContext('2d'); },
                renderData = {
                    bar: function(indata) {
                        var labels = [], data = [];
                        indata.forEach(
                            function(d,i,a) {
                                if (a.length-i < 100) {
                                    labels.push(d.word);
                                    data.push(d.count);   
                                }
                            }
                        );
                        return {
                            type: 'bar',
                            data: {
                                labels:labels,
                                datasets:[
                                    {
                                        label: 'Word Frequencies',
                                        data:data
                                    }
                                ]
                            },
                            options: {
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero:true
                                        }
                                    }]
                                }
                            }
                        };
                    }
                };

            return {
                restrict: 'E',
                link: function (scope, element, attrs) {

                    var context, dataGetter, rawData, chartType, chartData, renderedChart;

                    function drawChart() {
                        element.empty();
                        context = Context(element),
                        dataGetter = $parse(attrs.chartdata),
                        rawData = dataGetter(scope),
                        chartType = attrs.charttype || 'pie',
                        chartData = renderData[chartType](rawData),
                        renderedChart = new Chart(context, chartData);
                    }

                    //scope.$watch(attrs.chartdata, drawChart);
                    drawChart();
                }
            };

        }
    ]
};

var MELIZA = angular.module('meliza',[])
.controller(config.controllers)
.service(config.services)
.directive(config.directives);