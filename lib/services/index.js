var realtime = require('./realtime');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.initialize = function (app, callback) {
		var err;

		if (!app || !app.config || !app.log) {
			err = new Error('application context with config and log are required');
			return setImmediate(callback, err);
		}

		app.log.trace('initializing external service clients');

		self.realtime = realtime(app);

		return setImmediate(callback);
	};

	return self;
}({}));
