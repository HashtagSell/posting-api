var
	async = require('async'),
	bunyan = require('bunyan'),
	countdown = require('countdown'),
	mongodb = require('mongodb'),
	elasticsearch = require('es'),
	settings = require('settings-lib'),

	// vars
	baseConfigPath = './lib/config/default.json',
	mappings = require('../../lib/config/es-mappings.json'),
	nodePackage = require('../../package.json'),

	DEFAULT_GROUPING_HEADING_TYPE = 'grouping-heading',
	DEFAULT_POSTINGS_TYPE = 'posting-v1',
	DEFAULT_SOURCE_CODE = 'HSHTG';


module.exports = (function (app) {
	'use strict';

	/**
	 * Connect to Elasticsearch
	 **/
	function connectToElasticsearch (callback) {
		app.es = elasticsearch(app.config.data.es);

		async.waterfall([
			// determine if index exists
			app.es.indices.exists,

			// create index if necessary
			function (info, proceed) {
				if (info.exists) {
					return setImmediate(proceed);
				}

				app.es.indices.createIndex(function (err) {
					if (err) {
						return proceed(err);
					}

					return proceed();
				});
			},

			function (proceed) {
				return async.eachSeries(
					Object.keys(mappings.mappings),
					function (_type, next) {
						app.log.info('ensuring Elasticsearch _type: %s', _type);

						// put mapping
						app.es.indices.putMapping(
							{ _type : _type },
							mappings.mappings[_type],
							next);
					},
					proceed);
			},

			// retrieve server status
			function (proceed) {
				app.es.cluster.health(function (err, info) {
					if (err) {
						return proceed(err);
					}

					/* jshint sub : true */
					app.log.info(
						'successfully connected to Elasticsearch cluster %s',
						info['cluster_name']);

					return proceed();
				});
			}
		], callback);
	}

	/**
	 * Connect to Mongo
	 **/
	function connectToMongo (callback) {
		mongodb.MongoClient.connect(app.config.data.mongo.url, function (err, db) {
			if (err) {
				return callback(err);
			}

			app.log.trace(
				'successfully connected to Mongo at %s',
				app.config.data.mongo.url);

			// set db property
			app.db = db;

			return callback();
		});
	}

	/**
	 * Creates the logging mechanism for the entire application
	 **/
	function createLogger (callback) {
		app.log = bunyan.createLogger({
			level : app.config.logging.level,
			name : nodePackage.name
		});

		return setImmediate(callback);
	}

	/**
	 * Reads configuration for the application while taking into
	 * account any application environment overrides
	 **/
	function loadConfig (callback) {
		settings.initialize({
			baseConfigPath : baseConfigPath
		}, function (err, config) {
			if (err) {
				return callback(err);
			}

			app.config = config;
			return callback();
		});
	}

	async.auto({
		config : loadConfig,
		es : ['config', 'logging', connectToElasticsearch],
		logging : ['config', createLogger],
		mongo : ['config', 'logging', connectToMongo]
	}, function (err) {
		if (err) {
			(app.log || console).error(err);
			return;
		}

		app.log.info(
			'synchronizing postings from Mongo %s to Elasticsearch at %s:%d/%s',
			app.config.data.mongo.url,
			app.config.data.es.server.host,
			app.config.data.es.server.port,
			app.config.data.es._index);

		var
			errors = [],
			limit = 1000,
			postingsRetrieved = limit,
			skip = 0,
			totalPostings = 0;

		async.whilst(
			function () {
				return postingsRetrieved === limit;
			},
			function (callback) {
				app
					.db
					.collection('postings')
					.find({})
					.skip(skip)
					.limit(limit)
					.toArray(function (err, postings) {
						if (err) {
							return callback(err);
						}

						app.log.trace(
							'processing postings between %d and %d',
							skip,
							skip + limit);

						// increment counts
						postingsRetrieved = postings.length;
						skip += limit;
						totalPostings += postingsRetrieved;

						var
							bulkGroupingUpdate = [],
							bulkPostingUpdate = [],
							source,
							_ttl;

						postings.forEach(function (posting) {
							// instruction for grouping-heading
							bulkGroupingUpdate.push({
								update : {
									_id : posting.postingId,
									_index : app.config.data.es._index,
									_type : DEFAULT_GROUPING_HEADING_TYPE
								}
							});

							// document for grouping-heading
							bulkGroupingUpdate.push({
								doc : {
									categoryCode : posting.categoryCode,
									heading : posting.heading,
									source : source
								},
								'doc_as_upsert' : true
							});

							_ttl = countdown(
								new Date(),
								posting.expiresAt,
								countdown.DAYS);

							// determine source code for posting
							source = (posting.external && posting.external.source) ?
								(posting.external.source.code || DEFAULT_SOURCE_CODE) :
								DEFAULT_SOURCE_CODE;

							// do not index any filtered sources for search
							if (app.config.filters.externalSource.indexOf(source) !== -1) {
								return;
							}

							// instruction for posting-v1
							bulkPostingUpdate.push({
								update : {
									_id : posting.postingId,
									_index : app.config.data.es._index,
									_type : DEFAULT_POSTINGS_TYPE
								}
							});

							// document
							bulkPostingUpdate.push({
								doc : {
									_ttl : [_ttl.days, 'd'].join(''),
									body : posting.body,
									categoryCode : posting.categoryCode,
									createdAt : posting.createdAt,
									geo : {
										coordinates : {
											lat : posting.geo.coordinates[1],
											lon : posting.geo.coordinates[0]
										}
									},
									heading : posting.heading,
									source : source,
									username : posting.username
								},
								'doc_as_upsert' : true
							});
						});

						// make sure there is data to bulk index
						if (!bulkGroupingUpdate && !bulkPostingUpdate.length) {
							return setImmediate(callback);
						}

						// bulk upsert to Elasticsearch
						return async.series([
							async.apply(app.es.bulk, bulkGroupingUpdate),
							async.apply(app.es.bulk, bulkPostingUpdate)
						], function (err) {
							if (err) {
								err.skip = skip;
								err.limit = limit;

								errors.push(err);
							}

							return callback();
						});
					});
			},
			function () {
				if (errors) {
					app.log.warn('errors encountered while populating Elasticsearch');
					app.log.warn(errors);
				}

				app.log.info('completed processing %d postings', totalPostings);
				process.exit(0);
			});
	});

}({}));
