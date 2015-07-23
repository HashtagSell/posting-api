var
	async = require('async'),
	elasticsearch = require('es'),
	mongoose = require('mongoose'),
	mongooseMiddleware = require('mongoose-middleware'),

	groupings = require('./groupings'),
	offers = require('./offers'),
	postings = require('./postings'),
	questions = require('./questions'),
	reviews = require('./reviews'),
	tokenizer = require('./tokenizer'),
	transactions = require('./transactions'),

	mappings = require('../config/es-mappings.json');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	var es;

	/**
	 * Verify connectivity with Elasticsearch
	 **/
	function initializeES (app, callback) {
		// create client to Elasticsearch server
		es = elasticsearch(app.config.data.es);

		app.log.info(
			'connecting to Elasticsearch at %s:%d',
			app.config.data.es.server.host,
			app.config.data.es.server.port);

		async.waterfall([
			// determine if index exists
			es.indices.exists,

			// create index if necessary
			function (info, proceed) {
				if (info.exists) {
					return setImmediate(proceed);
				}

				es.indices.createIndex(function (err) {
					return proceed(err);
				});
			},

			function (proceed) {
				return async.eachSeries(
					Object.keys(mappings.mappings),
					function (_type, next) {
						app.log.info('ensuring Elasticsearch _type: %s', _type);

						// put mapping
						es.indices.putMapping(
							{ _type : _type },
							mappings.mappings[_type],
							next);
					},
					function (err) {
						return proceed(err);
					});
			},

			// retrieve server status
			function (proceed) {
				es.cluster.health(function (err, info) {
					if (err) {
						return proceed(err);
					}

					/* jshint sub : true */
					app.log.info(
						'successfully connected to cluster %s with %d nodes',
						info['cluster_name'],
						info['number_of_nodes']);

					return proceed();
				});
			}
		], callback);
	}

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
		mongoose.connection.once('open', callback);

		/*
		// Mongoose no longer supports connecting to the admin database in the same
		// way on Mongo 3.x
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
		//*/
	}

	/**
	 * Applies all DAL to the module.exports object for clients of this
	 * module to easily reference
	 **/
	function setupDataAccessModules (app, callback) {
		app.log.trace('initializing data access modules');

		self.groupings = groupings(app);
		self.offers = offers(app);
		self.postings = postings(app, es);
		self.questions = questions(app);
		self.reviews = reviews(app);
		self.tokenizer = tokenizer; // no init required
		self.transactions = transactions(app);

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
				async.apply(initializeES, app),
				async.apply(initializeMongo, app),
				async.apply(setupDataAccessModules, app)
			], callback);
	};

	return self;
}({}));
