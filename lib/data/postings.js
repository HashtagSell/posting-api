var
	async = require('async'),
	countdown = require('countdown'),
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	ES_SUPPORTED_KEYWORDS = ['beginsWith', 'contains', 'endsWith', 'exact'],
	ES_SUPPORTED_FIELDS = ['heading', 'body', 'categoryCode', 'username'],

	DEFAULT_POSTING_TYPE = 'posting-v1',

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
					index : true,
					type : String
				},

				categoryGroup : {			// 3taps item.category_group
					index : true,
					type : String
				},

				location : {
					city : {						// 3taps item.location.city
						index : true,
						type : String
					},

					country : {					// 3taps item.location.country
						index : true,
						type : String
					},

					county : {					// 3taps item.location.county
						index : true,
						type : String
					},

					formatted : String,	// 3taps item.formatted_address

					locality : {				// 3taps item.location.locality
						index : true,
						type : String
					},

					metro : {						// 3taps item.location.locality
						index : true,
						type : String
					},

					region : {					// 3taps item.location.locality
						index : true,
						type : String
					},

					state : {						// 3taps item.location.locality
						index : true,
						type : String
					},

					zipCode : {					// 3taps item.location.zipcode
						index : true,
						type : String
					}
				},

				status : {						// 3taps item.status
					index : true,
					type : String
				},

				timestamp : {
					index : true,
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
				index : '2dsphere',
				type : []
			},

			location: {
				city : String,
				country : String,
				postalCode : String,
				state : String,
				street1 : String,
				street2 : String
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
			index : true,
			type : String
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
			siteId : {
				type : Number
			},
			startTime : {
				type : Date
			},
			url : {
				type : String
			}
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
		var
			applyQueryFilters = function (filters, boolMatch) {
				Object.keys(filters).forEach(function (filterType) {

					// verify it's a filter type we can use to search in ES
					if (ES_SUPPORTED_KEYWORDS.indexOf(filterType) >= 0) {
						Object.keys(filters[filterType]).forEach(function (field) {

							// verify the field is a supportable search field in ES
							if (ES_SUPPORTED_FIELDS.indexOf(field) >= 0) {
								var match = {};
								match[field] = filters[filterType][field];

								// push keyword to the keywords list
								boolMatch.push({
									match : match
								});

								// remove from return options (as we'll filter for this in ES)
								delete filters[filterType][field];
							}
						});
					}
				});
			},
			query = {
				// only return ids
				fields : [],

				// the query itself
				query : {
					filtered : {
						query : {
							bool : {
								// mandatory
								must : [],

								// optional
								should : []
							}
						},
						filter : {
							'geo_distance_range' : {
								gte : [options.geo.min, 'm'].join(''),
								lt : [options.geo.max, 'm'].join(''),
								'geo.coordinates' : {
									lat : options.geo.coords[1],
									lon : options.geo.coords[0]
								}
							}
						}
					}
				},

				// ensure that results are sorted by geo distance
				sort : [{
					'_geo_distance' : {
						'geo.coordinates' : {
							lat : options.geo.coords[1],
							lon : options.geo.coords[0]
						},
						order : 'asc',
						unit : 'm'
					}
				}]
			},
			returnOptions = JSON.parse(JSON.stringify(options));

		// when geo lookups are conducted, sorting is usurped by distance
		delete returnOptions.sort;

		// find all keyword values
		if (returnOptions.filters && returnOptions.filters.mandatory) {
			applyQueryFilters(
				returnOptions.filters.mandatory,
				query.query.filtered.query.bool.must);
		}

		// optionals mapped to `should` - not sure this is all together correct
		// because should is supposed to enhance relevance, but the sort is being
		// accomplished via geographic distance from the specified geo point
		if (options.filters && options.filters.optional) {
			applyQueryFilters(
				returnOptions.filters.optional,
				query.query.filtered.query.bool.should);
		}

		// execute the search...
		return es.search({
				from : options.start,
				size : options.count
			},
			query,
			function (err, result) {
				if (err) {
					return callback(err);
				}

				// return...
				return callback(null, returnOptions, result.hits);
			});
	}

	self.aggregateByCategory = function (searchTerms, callback) {
		var
			matches = [],
			verr;

		// add each search term to the match
		searchTerms.forEach(function (regex) {
			matches.push({
				heading : regex
			}, {
				body : regex
			});
		});

		Posting
			.aggregate()
			.match({
				$or : matches
			})
			.group({
				_id : '$categoryCode',
				count : { $sum : 1 }
			})
			.sort({
				count : -1
			})
			.exec(function (err, result) {
				if (err) {
					verr = new VError(err, 'unable to aggregate postings');

					return callback(verr);
				}

				// remap _id to code
				result.forEach(function (code) {
					code.code = code._id;
					code._id = undefined;
				});

				return callback(null, result);
			});
	};

	self.find = function (options, callback) {
		var
			cursor,
			query = {},
			verr;

		async.waterfall([
				// check for geo - go to Elasticsearch when present
				function (next) {
					if (typeof options.geo === 'undefined') {
						return setImmediate(function () {
							return next(null, options, null);
						});
					}

					return search(options, next);
				},

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
					}

					app.log.trace(
						'filtered to %d postings via Elasticsearch',
						postingIds.length);

					Posting
						.find(query)
						.lean()
						.filter(updatedOptions)
						.page(options, next);
				}
			], function (err, postings) {
				if (err) {
					verr = new VError(err, 'unable to find postings');

					return callback(verr);
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

				// save it off...
				async.series([
					// first, to Elasticsearch...
					function (proceed) {
						// ensure there are geo coordinates
						if (!upsertPosting.geo || !upsertPosting.geo.coordinates) {
							app.log.warn(
								'not indexing posting %s for search - no geo coords provided',
								postingId);

							return setImmediate(proceed);
						}

						// define ttl using days distnace between expiresAt and now
						var _ttl = countdown(
							new Date(),
							upsertPosting.expiresAt,
							countdown.DAYS);

						// execute the upsert
						es.update({
							_id : postingId,
							_type : DEFAULT_POSTING_TYPE
						}, {
							doc : {
								_ttl : [_ttl.days, 'd'].join(''),
								body : upsertPosting.body,
								categoryCode : upsertPosting.categoryCode,
								geo : {
									coordinates : {
										lat : upsertPosting.geo.coordinates[1],
										lon : upsertPosting.geo.coordinates[0]
									}
								},
								heading : upsertPosting.heading,
								username : upsertPosting.username
							},
							'doc_as_upsert' : true
						}, proceed);
					},

					// second, to Mongo...
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
