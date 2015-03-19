var
	async = require('async'),
	countdown = require('countdown'),
	mws = require('mws-product'),

	// Configuration with all valid values for marketplace and query context
	// http://docs.developer.amazonservices.com/en_US/dev_guide/DG_Endpoints.html
	// http://docs.developer.amazonservices.com/en_US/products/Products_QueryContextIDs.html
	marketPlaceHash = require('../config/amazon.json'),

	DEFAULT_QUERYCONTEXT = 'All',
	DEFAULT_REGION = 'US';


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	app.log.info(
		'Setting Amazon MWS Seller account to %s',
		app.config.mws.sellerId);

	var clientUS = mws({
		auth : app.config.mws,
		marketplace : DEFAULT_REGION
	});

	self.findProductAttributes = function (query, queryContext, callback) {
		var attributes = [];

		async.waterfall([
			async.apply(self.listMatchingProducts, query, queryContext),
			function (result, done) {
				if (!result.length) {
					return setImmediate(done);
				}

				var
					attribute = '',
					keyParts = [],
					itemAttributes = result[0].AttributeSets ?
						result[0].AttributeSets['ns2:ItemAttributes'] :
						undefined;

				if (!itemAttributes) {
					return setImmediate(done);
				}

				Object.keys(itemAttributes).forEach(function (key) {
					// ignore attributes with $ in the name
					if (/\$/.test(key)) {
						return;
					}

					keyParts = key.split(/\:/);
					if (keyParts.length === 2) {
						// this regex splits the string on capital letters
						// and then inserts a space between the words... consecutive
						// capital letters are considered a single word
						attribute = keyParts[1].replace(
							/((?:<=[a-z])[A-Z]|[A-Z](?=[a-z]))/g,
							' $1');

						attributes.push(attribute.trim());
					}
				});

				return setImmediate(done);
			}
		], function (err) {
			if (err) {
				return callback(err);
			}

			return callback(null, attributes);
		});
	};

	self.listMatchingProducts = function (query, queryContext, callback) {
		// handle args
		if (typeof callback === 'undefined' && typeof queryContext === 'function') {
			callback = queryContext;
			queryContext = undefined;
		}

		// ensure a query is specified
		if (!query) {
			return setImmediate(callback, new Error('query is required'));
		}

		var startTime = new Date();

		// query the API
		clientUS.matchingProducts({
			query : query,
			queryContextId : queryContext || DEFAULT_QUERYCONTEXT
		}, function (err, data) {
			app.log.trace(
				'list matching products from Amazon MWS completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				return callback(err);
			}

			var
				matches = [],
				response = data.ListMatchingProductsResponse;

			if (response &&
					response.ListMatchingProductsResult &&
					response.ListMatchingProductsResult[0] &&
					response.ListMatchingProductsResult[0].Products) {
						matches = response
							.ListMatchingProductsResult[0]
							.Products
							.Product || [];
			}

			return callback(null, matches);
		});
	};

	self.getQueryContextList = function (region, callback) {
		if (typeof callback === 'undefined' && typeof region === 'function') {
			callback = region;
			region = DEFAULT_REGION;
		}

		return setImmediate(function () {
			var regionDetails = marketPlaceHash[region];

			return callback(null, regionDetails ? regionDetails.queryContext : []);
		});
	};

	return self;
};
