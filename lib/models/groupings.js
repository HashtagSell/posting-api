var
	countdown = require('countdown'),

	errors = require('./errors'),
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

	return self;
};
