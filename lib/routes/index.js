var
	postings = require('./postings'),
	version = require('./version');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.initialize = function (app, models, callback) {
		var err;

		if (!app || !app.config || !app.log) {
			err = new Error('application context with config and log are required');
			return setImmediate(callback, err);
		}

		if (!models) {
			err = new Error('models are required to register routes');
			return setImmediate(callback, err);
		}

		self.postings = postings(app, models);
		self.version = version(app);

		// return
		return setImmediate(callback);
	};

	return self;
}({}));
