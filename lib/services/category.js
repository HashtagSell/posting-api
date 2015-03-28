/**
 * Created by braddavis on 3/27/15.
 */
var
    countdown = require('countdown'),
    HashTable = require('hashtable');


module.exports = function (app, self) {
    'use strict';

    self = self || {};

    /**
     * Perform category weighting algorithm and predict what the most likely category is.. magic!
     * Returns array of category codes.
     **/
    self.lookup = function (postings, callback) {

        var startTime = new Date();

        //Calculate popular categories
        var results = postings.results;
        var loopCounter = 0;

        var catHashTable = new HashTable();

        if (results) {

            var numOfCategoryResults = results.length;

            for (var j = 0; j < numOfCategoryResults; j++) {

                var categoryCode = results[j].categoryCode;

                loopCounter++;

                //Tally how many times each category of items is returned
                var count = catHashTable.get(categoryCode);
                if (count) {
                    catHashTable.remove(categoryCode);
                    var increment = count+1;
                    catHashTable.put(categoryCode, increment);
                } else {
                    catHashTable.put(categoryCode, 1);
                }
            }


            //Divide number of unique categories by number of results to calculate our popular cateogry
            console.log("number of unique categories: ", catHashTable.size(), "& number of total results: ", loopCounter);
            var avgWeight = Math.abs(loopCounter / catHashTable.size());
            console.log("Our avg weight for a winning category is: ", avgWeight);

            var popularCategories = [];
            var totalAvgWeight = 0;
            var loopCounter = 0;
            var mostPopularCat = {
                count: 0,
                catCode: null
            };
            catHashTable.forEach(function (key, count) {

                var categoryWeight = count/results.length;

                if(categoryWeight < avgWeight){
                    catHashTable.remove(key);
                    console.log(key, " was found ", count, "times. Removing cause ", categoryWeight,"is less than", avgWeight);
                } else {
                    console.log(key, " was found ", count, "times. ADDING cause ", categoryWeight,"is more than", avgWeight);
                    popularCategories.push(key);
                    totalAvgWeight = totalAvgWeight + count;
                    loopCounter++;
                }

                if(count > mostPopularCat.count){
                    mostPopularCat.count = count;
                    mostPopularCat.catCode = key;
                }
            });

            if(!popularCategories.length){
                popularCategories.push(mostPopularCat.catCode);
            }

            app.log.trace(
                'popular categories %s were discovered in %s',
                popularCategories,
                countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

            return callback(null, popularCategories);
        }

    };

    return self;
};


//module.exports = function (app, self) {
//    'use strict';
//
//    self = self || {};
//
//    /**
//     * Geolocate clientIP via FreeGeoIP
//     * Returns lat and long.
//     **/
//    self.lookup = function (postings, callback) {
//
//        var popularCategory = "SELE";
//
//        return callback(null, popularCategory);
//    };
//
//    return self;
//};
