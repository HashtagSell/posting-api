var
	mongoose = require('mongoose'),
	mongooseMiddleware = require('mongoose-middleware'),

	offers = require('./offers'),
	postings = require('./postings'),
	questions = require('./questions');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	/**
	 * Gets called once, either when there is a connection error
	 * or once the connection succeeds to Mongo
	 **/
	function handleConnection (app, callback) {
		return function (err) {
			if (err) {
				return callback(err);
			}

			// register sub-modules
			setupDataAccessModules(app);

			// report on the Mongo version for diagnostics
			new mongoose
				.mongo
				.Admin(mongoose.connection.db)
				.buildInfo(function (err, info) {
					if (err) {
						app.log.warn('unable to read details about Mongo instance / cluster');
						app.log.warn(err);

						return callback();
					}

					app.log.trace('MongoDB version %s', info.version);
					return callback();
				});
		};
	}

	/**
	 * Applies all DAL to the module.exports object for clients of this
	 * module to easily reference
	 **/
	function setupDataAccessModules (app) {
		app.log.trace('initializing data access modules');

		self.offers = offers(app);
		self.postings = postings(app);
		self.questions = questions(app);

		return;
	}

	/**
	 * Closes the connection to Mongo
	 **/
	self.close = function (callback) {
		return mongoose.disconnect(callback);
	};

	/**
	 * Opens a connection to Mongo and prepares Mongoose Middleware and
	 * ensures all sub-modules of lib/data are ready for use
	 **/
	self.initialize = function (app, callback) {
		var wrapCallback = handleConnection(app, callback);

		// only connect to Mongo if not already connected
		if (mongoose.connection.readyState !== 0) {
			return setImmediate(callback);
		}

		// connect to Mongo
		app.log.info('connecting to %s', app.config.data.url);
		mongoose.connect(app.config.data.url);

		// load middleware component for easy search, pagination, projection, etc.
		app.log.info(
			'setting max document limit for paginated queries to %d',
			app.config.data.documentCountLimit);
		mongooseMiddleware.initialize({
			maxDocs : app.config.data.documentCountLimit
		}, mongoose);

		// listen on key events
		mongoose.connection.on('error', wrapCallback);
		mongoose.connection.once('open', wrapCallback);

		return;
	};

	return self;
}({}));
