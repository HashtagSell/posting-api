var
	countdown = require('countdown'),

	errors = require('./errors'),
	validation = require('./validation'),

	DEFAULT_QUERYCONTEXT = 'All';


module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	self.find = function (query, queryContext, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(query)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'query is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(queryContext)) {
			queryContext = DEFAULT_QUERYCONTEXT;
		}

		services.amazon.findProductAttributes(
			query,
			queryContext,
			function (err, annotations) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find annotations');
					modelError.query = query;
					modelError.queryContext = queryContext;

					return callback(modelError);
				}

				app.log.trace('find annotations completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, annotations);
			});
	};

	self.getQueryContextList = function (callback) {
		var
			modelError,
			startTime = new Date();

		services.amazon.getQueryContextList(
			function (err, result) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to retrieve query context list');

					return callback(modelError);
				}

				app.log.trace('retrieve query context completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, result);
			});
	};

	return self;
};
