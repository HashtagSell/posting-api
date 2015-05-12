var
	annotations = require('./annotations'),
	groupings = require('./groupings'),
	notifications = require('./notifications'),
	offers = require('./offers'),
	postings = require('./postings'),
	questions = require('./questions'),
	transactions = require('./transactions');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.initialize = function (app, data, services, callback) {
		var err;

		if (!app || !app.config || !app.log) {
			err = new Error('application context with config and log are required');
			return setImmediate(callback, err);
		}

		if (!data) {
			err = new Error('data context is required to initialize models');
			return setImmediate(callback, err);
		}

		app.log.trace('initializing business layer modules');

		self.annotations = annotations(app, data, services);
		self.groupings = groupings(app, data, services);
		self.notifications = notifications(app, data, services);
		self.offers = offers(app, data, services);
		self.postings = postings(app, data, services);
		self.questions = questions(app, data, services);
		self.transactions = transactions(app, data, services);

		return setImmediate(callback);
	};

	return self;
}({}));
