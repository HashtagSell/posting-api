var
	async = require('async'),

	amazon = require('./amazon'),
	ebay = require('./ebay'),
	geo = require('./geo'),
	notifications = require('./notifications'),
	realtime = require('./realtime');


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

		self.amazon = amazon(app);
		self.ebay = ebay(app);
		self.geo = geo(app);
		self.notifications = notifications(app);
		self.realtime = realtime(app);

		// service specific initialization
		return async.series([
			// sets notification preferences in eBay
			async.apply(self.ebay.setNotificationPreferences)
		], callback);
	};

	return self;
}({}));
