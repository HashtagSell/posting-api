var
	offers = require('./offers'),
	postings = require('./postings'),
	questions = require('./questions');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.initialize = function (app, data, callback) {
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

		self.offers = offers(app, data);
		self.postings = postings(app, data);
		self.questions = questions(app, data);

		return setImmediate(callback);
	};

	return self;
}({}));
