var
	async = require('async'),
	countdown = require('countdown'),

	errors = require('./errors'),
	tokenizer = require('./tokenizer'),
	validation = require('./validation');


module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	self.find = function (options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.groupings.find(options, function (err, groupings) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find groupings');
				modelError.options = options;

				return callback(modelError);
			}

			app.log.trace('find groupings completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, groupings);
		});
	};

	self.findByCode = function (code, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(code)) {
			modelError =
				new errors.RequiredFieldMissingError('code parameter is required');

			return callback(modelError);
		}

		async.waterfall([
			async.apply(data.groupings.findByCode, code),
			function (grouping, next) {
				if (typeof next === 'undefined' && typeof grouping === 'function') {
					next = grouping;
					grouping = undefined;
				}

				if (grouping) {
					return setImmediate(function () {
						return next(null, grouping);
					});
				}

				return data.groupings.findCategoryByCode(code, next);
			}
		], function (err, grouping) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find grouping');
				modelError.code = code;

				return callback(modelError);
			}

			if (!grouping) {
				modelError = new errors.ResourceNotFoundError(
					'no grouping exists for specified code');
				modelError.code = code;

				return callback(modelError);
			}

			app.log.trace('findByCode completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, grouping);
		});
	};

	self.findPopular = function (searchTerms, callback) {
		var
			keywords = tokenizer.analyzeKeywords(searchTerms),
			modelError,
			startTime = new Date();

		if (validation.isEmpty(keywords)) {
			modelError =
				new errors.RequiredFieldMissingError('search term(s) are required');

			return callback(modelError);
		}

		async.waterfall([
			function (done) {
				data.postings.aggregateByCategory(
					keywords.join(' '),
					function (err, result) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to find popular categories');
							modelError.keywords = keywords;
							modelError.searchTerms = searchTerms;

							return callback(modelError);
						}

						if (!result) {
							app.log.trace('findPopular returned no results...');
						} else {
							app.log.trace('findPopular completed in %s',
								countdown(startTime, new Date(), countdown.MILLISECONDS).toString());
						}

						// return
						return done(null, result);
					});
			},

			// fallbuck fuzzy query in the event the first one has no results
			function (result, done) {
				if (result && result.length) {
					return setImmediate(function () {
						return done(null, result);
					});
				}

				data.postings.aggregateByCategory(
					keywords.join(' '),
					true, // dis shiz is teh fuzzeh
					function (err, result) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to find (fuzzy) popular categories');
							modelError.keywords = keywords;
							modelError.searchTerms = searchTerms;

							return callback(modelError);
						}

						if (!result) {
							modelError = new errors.ResourceNotFoundError(
								'nothing exists matching specified (fuzzy) search term(s)');
							modelError.keywords = keywords;
							modelError.searchTerms = searchTerms;

							return callback(modelError);
						}

						app.log.trace('findPopular (fuzzy) completed in %s',
							countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

						// return
						return done(null, result);
					});
			}
		], callback);
	};

	self.findSuggested = function (searchTerms, callback) {
		var
			keywords = tokenizer.analyzeKeywords(searchTerms),
			modelError,
			startTime = new Date();

		if (validation.isEmpty(keywords)) {
			modelError =
				new errors.RequiredFieldMissingError('search term(s) are required');

			return callback(modelError);
		}

		async.waterfall([
			function (done) {
				data.postings.findSuggestedCategoryCodes(
					keywords.join(' '),
					function (err, result) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to find suggested categories');
							modelError.keywords = keywords;
							modelError.searchTerms = searchTerms;

							return callback(modelError);
						}

						if (!result) {
							app.log.trace('findSuggested returned no results...');
						} else {
							app.log.trace('findSuggested completed in %s',
								countdown(startTime, new Date(), countdown.MILLISECONDS).toString());
						}

						// return
						return done(null, result);
					});
			},

			// fallbuck fuzzy query in the event the first one has no results
			function (result, done) {
				if (result && result.length) {
					return setImmediate(function () {
						return done(null, result);
					});
				}

				data.postings.findSuggestedCategoryCodes(
					keywords.join(' '),
					true, // dis shiz is teh fuzzeh
					function (err, result) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to find (fuzzy) suggested categories');
							modelError.keywords = keywords;
							modelError.searchTerms = searchTerms;

							return callback(modelError);
						}

						if (!result) {
							modelError = new errors.ResourceNotFoundError(
								'nothing exists matching specified (fuzzy) search term(s)');
							modelError.keywords = keywords;
							modelError.searchTerms = searchTerms;

							return callback(modelError);
						}

						app.log.trace('findSuggested (fuzzy) completed in %s',
							countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

						// return
						return done(null, result);
					});
			}
		], callback);
	};

	return self;
};
