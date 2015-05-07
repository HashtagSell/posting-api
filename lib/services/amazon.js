var
	os = require('os'),

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

	function getAttributeValue (value) {
		// if it's a string, just return it
		if (typeof value === 'string') {
			return value;
		}

		// look for an array of strings (i.e. a formatted paragraph)
		if (Array.isArray(value) && typeof value[0] === 'string') {
			return value.join(os.EOL);
		}

		// look for a top-level value object
		if (typeof value === 'object') {
			var keys = Object.keys(value);
			if (keys[0] === 'C$') {
				/* jshint sub : true */
				return [value['C$'], value['A$'].Units].join(' ');
			}
		}

		return undefined;
	}

	self.findProductAttributes = function (query, queryContext, callback) {
		var
			attributes = [],
			attributeHash = {};

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
						undefined,
					value;

				if (!itemAttributes) {
					return setImmediate(done);
				}

				// populate attributes hash with all attributes
				Object.keys(itemAttributes).forEach(function (key) {
					// ignore attributes with $ in the name
					if (/\$/.test(key) || /Feature$/.test(key) || /Title$/.test(key)) {
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

						attributeHash[key] = {
							name : attribute.trim(),
							values : []
						};
					}
				});

				// populate attributes hash with all values
				result.forEach(function (match) {
					itemAttributes = match.AttributeSets ?
						match.AttributeSets['ns2:ItemAttributes'] :
						undefined;

					if (!itemAttributes) {
						return;
					}

					Object.keys(itemAttributes).forEach(function (key) {
						if (!attributeHash[key]) {
							return;
						}

						value = getAttributeValue(itemAttributes[key]);

						if (value && attributeHash[key].values.indexOf(value) === -1) {
							attributeHash[key].values.push(value);
						}
					});
				});

				return setImmediate(done);
			}
		], function (err) {
			if (err) {
				return callback(err);
			}

			// abstract values and return
			Object.keys(attributeHash).forEach(function (a) {
				// only push attributes that have multiple values
				if (attributeHash[a].values.length > 1) {
					attributes.push(attributeHash[a]);
				}
			});

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
				err.query = query;
				err.queryContextId = queryContext || DEFAULT_QUERYCONTEXT;

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
