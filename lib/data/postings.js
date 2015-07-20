var
	async = require('async'),
	countdown = require('countdown'),
	mongoose = require('mongoose'),
	VError = require('verror'),

	elasticsearch = require('./elasticsearch'),
	extensions = require('./extensions'),

	DEFAULT_GROUPING_HEADING_TYPE = 'grouping-heading',
	DEFAULT_POSTING_TYPE = 'posting-v1',
	DEFAULT_SOURCE_CODE = 'HSHTG',
	//ES_MAX_COUNT = 1000,

	postingSchema = mongoose.Schema({
		/* All external system data */
		external : {
			/* Original source info */
			source : {
				code : String,				// 3taps item.source
				id : String,					// 3taps item.external_id
				url : String					// 3taps item.external_url
			},

			/* 3Taps specific info */
			threeTaps : {
				id : {								// 3taps item.id
					index : true,
					type : Number
				},

				category : {					// 3taps item.category
					type : String
				},

				categoryGroup : {			// 3taps item.category_group
					type : String
				},

				location : {
					city : {						// 3taps item.location.city
						type : String
					},

					country : {					// 3taps item.location.country
						type : String
					},

					county : {					// 3taps item.location.county
						type : String
					},

					formatted : String,	// 3taps item.formatted_address

					locality : {				// 3taps item.location.locality
						type : String
					},

					metro : {						// 3taps item.location.locality
						type : String
					},

					region : {					// 3taps item.location.locality
						type : String
					},

					state : {						// 3taps item.location.locality
						type : String
					},

					zipCode : {					// 3taps item.location.zipcode
						type : String
					}
				},

				status : {						// 3taps item.status
					type : String
				},

				timestamp : {
					type : Number
				}
			}
		},

		/* Annotations are extensible properties / attributes of the posting */
		/* Note: Not indexed - queries based on this field will perform poorly */
		annotations : 					// 3taps item.annotations
			mongoose.Schema.Types.Mixed,

		/* Pricing Information */
		askingPrice : {
			currency : {
				default : 'USD',
				type : String
			},
			value : String
		},

		/* Date time when the posting was created */
		createdAt : {
			default : new Date(),
			required : true,
			type : Date
		},

		/* TTL for the document in Mongo */
		expiresAt : {							// 3taps item.expires
			expireAfterSeconds : 0,
			required : true,
			type : Date
		},

		/* Geo Spatial Coordinates - indexed for Mongo distance searching */
		geo : {
			accuracy : Number,		// 3taps item.location.accuracy

			coordinates: {				// 3taps [item.location.lat, item.location.long]
				default : [0, 0],
				type : []
			},

			status : Number				// 3taps item.location.geolocation_status
		},

		categoryCode : {				// loosely relates to 3taps item.category
			index : true,
			required : true,
			type : String
		},

		body : {								// 3taps item.body
			required : true,
			type : String
		},

		heading : {							// 3taps item.heading
			required : true,
			type : String
		},

		images :								// 3taps item.images
			[mongoose.Schema.Types.Mixed],

		/* Language info */
		language : {						// 3taps item.language
			default : 'EN',
			type : String
		},

		location: {
			city : String,
			country : String,
			postalCode : String,
			state : String,
			street1 : String,
			street2 : String
		},

		/* Hashtagsell posting ID */
		postingId : {
			index : {
				unique : true
			},
			required : true,
			type : String
		},

		/* externally published postings */
		ebay : {
			categoryId : {
				type : Number
			},
			endTime : {
				type : Date
			},
			itemId : {
				type : Number
			},
			paypalEmail : {
				type : String
			},
			siteId : {
				type : Number
			},
			startTime : {
				type : Date
			},
			token : {
				type : String
			},
			url : {
				type : String
			}
		},

		facebook : {
			type : mongoose.Schema.Types.Mixed
		},

		payment : {
			type : mongoose.Schema.Types.Mixed
		},

		twitter : {
			type : mongoose.Schema.Types.Mixed
		},

		username : {
			index : true,
			required : false,
			type : String
		}

	}, {
		strict : false,					// allow additional meta not specified in schema
		versionKey : false			// disable versioning
	});


module.exports = function (app, es, self) {
	'use strict';

	self = self || {};

	// extend schema
	extensions.toObject(postingSchema);

	// create mongoose model
	var Posting = mongoose.model('postings', postingSchema);

	function search (options, callback) {
		async.waterfall([
			// create the initial query
			function (next) {
				if (typeof options.geo === 'undefined') {
					return elasticsearch.buildQuery(
						options,
						next);
				}

				return elasticsearch.buildGeoQuery(
					options,
					next);
			},

			// perform the initial search
			function (returnOptions, query, next) {
				return es.search({
						_type : DEFAULT_POSTING_TYPE,
						from : returnOptions.start,
						size : returnOptions.count
					},
					query,
					function (err, result) {
						if (err) {
							err.query = query;
							err.returnOptions = returnOptions;

							return callback(err);
						}

						// return...
						return next(null, returnOptions, result.hits);
					});
			}
		], callback);
	}

	self.aggregateByCategory = function (searchTerms, callback) {
		var
			query = {
				aggs : {
					'group_by_categoryCode': {
						terms : {
							field : 'categoryCode'
						}
					}
				},
				query : {
					match : {
						heading : searchTerms
					}
				}
				/*
				// multi-field fuzzy match
				query : {
					'multi_match' : {
						fields : ['heading', 'body'],
						fuzziness : 'AUTO',
						query : searchTerms
					}
				}
				//*/
			},
			verr;

		es.search({
				_type : DEFAULT_POSTING_TYPE,
				size : 0
			},
			query,
			function (err, result) {
				if (err) {
					verr = new VError(err, 'unable to aggregate postings');

					return callback(verr);
				}

				/* jshint sub : true */
				if (result.aggregations && result.aggregations['group_by_categoryCode']) {
					result = result.aggregations['group_by_categoryCode'].buckets;

					result.forEach(function (code) {
						code.code = code.key;
						code.count = code['doc_count'];

						// remove redundant fields
						code.key = undefined;
						code['doc_count'] = undefined;
					});

					return callback(null, result);
				}
			});
	};

	self.find = function (options, callback) {
		var
			cursor,
			query = {},
			verr;

		async.waterfall([
				// go to Elasticsearch for first layer of search
				async.apply(search, options),

				// now further filter in MongoDB
				function (updatedOptions, hits, next) {
					if (hits) {
						var postingIds = [];

						hits.hits.forEach(function (hit) {
							postingIds.push(hit._id);
						});

						query = {
							postingId : {
								$in : postingIds
							}
						};

						app.log.trace(
							'filtered to %d postings via Elasticsearch',
							postingIds.length);
					}

					// second layer of filtering
					cursor = Posting
						.find(query)
						.lean()
						.filter(updatedOptions);

					if (hits) {
						return cursor.exec(function (err, postings) {
							if (err) {
								verr = new VError(err, 'unable to find postings');

								return next(verr);
							}

							var
								result = {
									options : options,
									results : [],
									total : hits.total
								},
								resultHash = {};

							// sort the results in order of results from Elasticsearch
							postings.forEach(function (posting) {
								resultHash[posting.postingId] = posting;
							});

							hits.hits.forEach(function (hit) {
								var posting = resultHash[hit._id];

								if (posting) {
									posting.geo.distance = hit.sort[0];
									result.results.push(posting);
								}
							});

							return next(null, result);
						});
					}

					return cursor.page(updatedOptions, function (err, postings) {
						if (err) {
							verr = new VError(err, 'unable to find postings');

							return next(verr);
						}

						// sort the results in order of results from Elasticsearch
						if (hits) {
							var resultHash = {};
							postings.results.forEach(function (posting) {
								resultHash[posting.postingId] = posting;
							});

							postings.results = [];
							hits.hits.forEach(function (hit) {
								var posting = resultHash[hit._id];

								if (posting) {
									posting.geo.distance = hit.sort[0];
									postings.results.push(posting);
								}
							});
						}

						return next(null, postings);
					});
				}
			], function (err, postings) {
				if (err) {
					return callback(err);
				}

				return callback(null, extensions.transformPageResults(postings));
			});
	};

	self.findById = function (externalId, source, callback) {
		// verify arguments and redirect method call as necessary
		if (typeof source === 'undefined' || typeof callback === 'undefined') {
			return self.findByPostingId(externalId, callback || source);
		}

		var
		 	query = {},
			verr;

		if (source === '3taps') {
			query['external.threeTaps.id'] = externalId;
		} else {
			query['external.source.code'] = source;
			query['external.source.id'] = externalId;
		}

		Posting
			.findOne(query)
			.exec(function (err, posting) {
				if (err) {
					verr = new VError(
						err,
						'findById for posting %s from %s failed',
						externalId,
						source);

					return callback(verr);
				}

				if (!posting) {
					app.log.trace(
						'no postings with postingId %s from %s exist',
						externalId,
						source);

					return callback();
				}

				return callback(null, posting.toObject({ transform : true }));
			});
	};

	self.findByPostingId = function (postingId, callback) {
		var verr;

		Posting
			.findOne({ postingId : postingId })
			.exec(function (err, posting) {
				if (err) {
					verr = new VError(
						err,
						'findByPostingId for posting %s failed',
						postingId);

					return callback(verr);
				}

				if (!posting) {
					app.log.trace('no postings with postingId %s exist', postingId);
					return callback();
				}

				return callback(null, posting.toObject({ transform : true }));
			});
	};

	self.findByUsername = function (username, options, callback) {
		var
			query = { username : username },
			verr;

		// check to see if questions should be limited to those with answers
		if (options.excludeEmptyQuestions) {
			query.questions = query.questions || {};

			query.questions.$not = {
				$size : 0
			};

			delete options.excludeEmptyQuestions;
		}

		// check to see if a date based query is necessary
		if (options.from) {
			query.questions = query.questions || {};

			query.questions.$elemMatch = {
				createdAt : {
					$gte : new Date(options.from)
				}
			};

			delete options.from;
		}

		Posting
			.find(query)
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, postings) {
				if (err) {
					verr = new VError(
						err,
						'unable to find postings for username %s',
						username);

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(postings));
			});
	};

	self.findMostRecentExternal = function (options, callback) {
		var
			query = {
				'external.threeTaps.location.metro' : options.metro,
				'external.threeTaps.location.state' : options.state
			},
			verr;

		Posting
			.find(JSON.parse(JSON.stringify(query)))
			.exists('external.threeTaps.id')
			.lean()
			.limit(1)
			.sort({ createdAt : -1 })
			.exec(function (err, posting) {
				if (err) {
					verr = new VError(err, 'find most recent posting failed');
					return callback(verr);
				}

				return callback(null, extensions.transformResults(posting)[0]);
			});
	};

	self.findSuggestedCategoryCodes = function (searchTerms, callback) {
		var
			query = {
				aggs : {
					'group_by_categoryCode': {
						terms : {
							field : 'categoryCode'
						}
					}
				},
				query : {
					match : {
						heading : searchTerms
					}
				}
			},
			verr;

		es.search({
				_type : DEFAULT_GROUPING_HEADING_TYPE,
				size : 0
			},
			query,
			function (err, result) {
				if (err) {
					verr = new VError(err, 'unable to find suggested category codes');

					return callback(verr);
				}

				/* jshint sub : true */
				if (result.aggregations && result.aggregations['group_by_categoryCode']) {
					result = result.aggregations['group_by_categoryCode'].buckets;

					result.forEach(function (code) {
						code.code = code.key;
						code.relevance = 100 - (result.length / code['doc_count'] * 100);

						// remove redundant fields
						code.key = undefined;
						code['doc_count'] = undefined;
					});

					return callback(null, result);
				}
			});
	};

	self.remove = function (postingId, callback) {
		var verr;

		Posting
			.findOne({ postingId : postingId })
			.exec(function (err, posting) {
				if (err) {
					verr = new VError(err, 'lookup of posting %s failed', postingId);
					return callback(verr);
				}

				posting.remove(function (err) {
					if (err) {
						verr =
							new VError(err, 'removal of posting %s has failed', postingId);
						return callback(verr);
					}

					// remove from Elasticsearch
					es.delete({
						_id : postingId,
						_type : DEFAULT_POSTING_TYPE
					}, function (err) {
						if (err) {
							app.log.warn(
								'unable to remove posting %s from Elasticsearch',
								postingId);
							app.log.warn(err);

							return;
						}
					});

					return callback(null, posting.toObject({ transform : true }));
				});
			});
	};

	self.upsert = function (postingId, posting, callback) {
		if (typeof callback === 'undefined' && typeof posting === 'function') {
			callback = posting;
			posting = postingId;
			postingId = posting.postingId || null;
		}

		var verr;

		// attempt to look up a posting with specified ID
		Posting
			.findOne({ postingId : postingId })
			.exec(function (err, upsertPosting) {
				if (err) {
					verr = new VError(err, 'lookup of posting %s failed', postingId);
					return callback(verr);
				}

				// check for insert
				if (!upsertPosting) {
					app.log.trace('creating new posting with postingId %s', postingId);

					// create new posting with postingId
					upsertPosting = new Posting();
					upsertPosting.postingId = postingId;
				} else {
					app.log.trace(
						'updating existing posting with postingId %s',
						postingId);

					// ensure postingId remains intact
					delete posting.postingId;
				}

				// update fields
				extensions.updateFields(upsertPosting, posting);

				// ensure source is specified for posting
				if (!upsertPosting.external || !upsertPosting.external.source) {
					upsertPosting.external = upsertPosting.external || {};
					upsertPosting.external.source = upsertPosting.external.source || {};
				}

				upsertPosting.external.source.code =
					upsertPosting.external.source.code ||
					DEFAULT_SOURCE_CODE;

				// save it off...
				async.series([
					// first, to Elasticsearch grouping type...
					function (proceed) {
						es.update({
							_id : postingId,
							_type : DEFAULT_GROUPING_HEADING_TYPE
						}, {
							doc : {
								categoryCode : upsertPosting.categoryCode,
								heading : upsertPosting.heading,
								source : upsertPosting.external.source.code
							},
							'doc_as_upsert' : true
						}, proceed);
					},

					// next, to Elasticsearch posting type...
					function (proceed) {
						// do not index any filtered sources for search
						if (app.config.filters.externalSource.indexOf(
							upsertPosting.external.source.code) !== -1) {
							app.log.trace(
								'not indexing posting %s for search - source %s is filtered',
								postingId,
								upsertPosting.external.source);

							return setImmediate(proceed);
						}

						// define ttl using days distnace between expiresAt and now
						var
							city,
							state,
							_ttl = countdown(
								new Date(),
								upsertPosting.expiresAt,
								countdown.DAYS);

						// ensure there are geo coordinates
						upsertPosting.geo = upsertPosting.geo || {};
						upsertPosting.geo.coordinates = upsertPosting.geo.coordinates || [];

						if (!upsertPosting.geo.coordinates.length) {
							app.log.trace(
								'applying coordinates of 0,0 when indexing posting %s',
								postingId);

							upsertPosting.geo.coordinates = [0, 0];
						}

						// determine city and state for posting
						if (upsertPosting.location) {
							city = upsertPosting.location.city;
							state = upsertPosting.location.state;
						}

						// if geo.location is not set then use external threeTaps data
						if (upsertPosting.external &&
							upsertPosting.external.threeTaps &&
							upsertPosting.external.threeTaps.location) {
							city = city || upsertPosting.external.threeTaps.location.city;
							state = state || upsertPosting.external.threeTaps.location.state;
						}

						// execute the upsert
						es.update({
							_id : postingId,
							_type : DEFAULT_POSTING_TYPE
						}, {
							doc : {
								_ttl : [_ttl.days, 'd'].join(''),
								body : upsertPosting.body,
								categoryCode : upsertPosting.categoryCode,
								createdAt : upsertPosting.createdAt,
								geo : {
									coordinates : {
										lat : upsertPosting.geo.coordinates[1],
										lon : upsertPosting.geo.coordinates[0]
									}
								},
								heading : upsertPosting.heading,
								location : {
									city : city,
									state : state,
								},
								source : upsertPosting.external.source.code,
								username : upsertPosting.username
							},
							'doc_as_upsert' : true
						}, proceed);
					},

					// finally, to Mongo...
					upsertPosting.save
				], function (err) {
					if (err) {
						verr = new VError(err, 'save of posting %s failed', postingId);
						return callback(verr);
					}

					// return to caller
					return callback(null, upsertPosting.toObject({ transform : true }));
				});
			});
	};

	return self;
};
