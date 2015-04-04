var
	util = require('util'),

	countdown = require('countdown'),

	errors = require('./errors'),
	validation = require('./validation'),

	DEFAULT_EXCLUDE_SEARCH_TERMS = [
		'a',
		'and',
		'or',
		'it',
		'the'];


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

		data.groupings.findByCode(code, function (err, grouping) {
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
			modelError,
			searchTermsRegex = [],
			startTime = new Date();

		app.log.trace(searchTerms);

		if (validation.isEmpty(searchTerms)) {
			modelError =
				new errors.RequiredFieldMissingError('search term(s) are required');

			return callback(modelError);
		}

		// prepare searchTerms by splitting on , and space but not within
		// quotes (single or double)
		searchTerms = searchTerms.split(/(["'][^"|^']+["']|[^,\s]+)/g);
		searchTerms.forEach(function (term) {
			term = term.trim().replace(/\"|\'|\,/g, '');

			if (term !== '' && DEFAULT_EXCLUDE_SEARCH_TERMS.indexOf(term) === -1) {
				searchTermsRegex.push(
					new RegExp(util.format('\\b%s\\b', term), 'gim'));
			}
		});

		data.postings.aggregateByCategory(searchTermsRegex, function (err, result) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find popular categories');
				modelError.searchTerms = searchTerms;

				return callback(modelError);
			}

			if (!result) {
				modelError = new errors.ResourceNotFoundError(
					'nothing exists matching specified search term(s)');
				modelError.searchTerms = searchTerms;

				return callback(modelError);
			}

			app.log.trace('findPopular completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, result);
		});
	};

	return self;
};
