var
	async = require('async'),
	mongoose = require('mongoose'),
	mongooseMiddleware = require('mongoose-middleware'),
	redis = require('redis'),

	groupings = require('./groupings'),
	offers = require('./offers'),
	postings = require('./postings'),
	questions = require('./questions');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	/**
	 * Creates connection to Mongo
	 **/
	function initializeMongo (app, callback) {
		// only connect to Mongo if not already connected
		if (mongoose.connection.readyState !== 0) {
			return setImmediate(callback);
		}

		// connect to Mongo
		app.log.info('connecting to Mongo at %s', app.config.data.mongo.url);
		mongoose.connect(app.config.data.mongo.url);

		// load middleware component for easy search, pagination, projection, etc.
		app.log.info(
			'setting max document limit for paginated queries to %d',
			app.config.data.mongo.documentCountLimit);
		mongooseMiddleware.initialize({
			maxDocs : app.config.data.mongo.documentCountLimit
		}, mongoose);

		// listen on key events
		mongoose.connection.on('error', callback);
		mongoose.connection.once('open', function () {
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
		});
	}

	function initializeRedis (app, callback) {
		// bypass Redis connection if not enabled
		if (!app.config.data.redis.enabled) {
			return setImmediate(callback);
		}

		// connect to Redis
		app.log.info('connecting to Redis on %s:%d',
			app.config.data.redis.host,
			app.config.data.redis.port);

		self.redis = redis.createClient(
			app.config.data.redis.port,
			app.config.data.redis.host,
			{
				parser : 'javascript'
			});

		// listen on key events
		self.redis.on('error', callback);
		self.redis.once('connect', function () {
			self.redis.info('server', function (err, info) {
				if (err) {
					app.log.warn('unable to read info about Redis instance');
					app.log.warn(err);

					return callback();
				}

				app.log.trace('Redis %s', info);

				return callback();
			});
		});
	}

	/**
	 * Applies all DAL to the module.exports object for clients of this
	 * module to easily reference
	 **/
	function setupDataAccessModules (app, callback) {
		app.log.trace('initializing data access modules');

		self.groupings = groupings(app);
		self.offers = offers(app);
		self.postings = postings(app);
		self.questions = questions(app);

		return setImmediate(callback);
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
		if (!app || !app.config || !app.log) {
			var err = new Error('application context with config and log are required');
			return setImmediate(callback, err);
		}

		async.waterfall([
				async.apply(initializeMongo, app),
				async.apply(initializeRedis, app),
				async.apply(setupDataAccessModules, app)
			], callback);
	};

	return self;
}({}));
