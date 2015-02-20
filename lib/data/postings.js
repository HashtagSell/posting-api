var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

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

		username : {
			index : true,
			required : false,
			type : String
		}

	}, {
		strict : false,					// allow additional meta not specified in schema
		versionKey : false			// disable versioning
	});


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	// extend schema
	extensions.toObject(postingSchema);

	// create mongoose model
	var Posting = mongoose.model('postings', postingSchema);

	self.find = function (options, callback) {
		var
			coords = [],
			query = {},
			verr;

		if (typeof options.geo !== 'undefined') {
			app.log.trace('applying geo coords to search...');

			query['geo.coordinates'] = {
				$near : {
					$geometry : {
						type : 'Point',
						coordinates : options.geo.coords
					},
					$maxDistance : options.geo.max,
					$minDistance : options.geo.min
				}
			};
		}

		Posting
			.find(query)
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, postings) {
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
				upsertPosting.save(function (err) {
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
