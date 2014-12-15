var
	mongoose = require('mongoose'),
	VError = require('verror'),

	postingSchema = mongoose.Schema({
		/* All external system data */
		external : {
			/* Original source info */
			source : {
				code : String,			// 3taps item.source
				id : String,				// 3taps item.external_id
				url : String				// 3taps item.external_url
			},

			/* 3Taps specific info */
			threeTaps : {
				id : {							// 3taps item.id
					index : {
						unique : true
					},
					type : Number
				},

				category : {				// 3taps item.category
					index : true,
					type : String
				},

				categoryGroup : {		// 3taps item.category_group
					index : true,
					type : String
				},

				location : {
					city : {					// 3taps item.location.city
						index : true,
						type : String
					},

					country : {				// 3taps item.location.country
						index : true,
						type : String
					},

					county : {				// 3taps item.location.county
						index : true,
						type : String
					},

					formatted : String,	// 3taps item.formatted_address

					locality : {			// 3taps item.location.locality
						index : true,
						type : String
					},

					metro : {					// 3taps item.location.locality
						index : true,
						type : String
					},

					region : {				// 3taps item.location.locality
						index : true,
						type : String
					},

					state : {					// 3taps item.location.locality
						index : true,
						type : String
					},

					zipCode : {				// 3taps item.location.zipcode
						index : true,
						type : String
					}
				},

				status : {					// 3taps item.status
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
		created : {
			default : new Date(),
			required : true,
			type : Date
		},

		/* TTL for the document in Mongo */
		expires : {							// 3taps item.expires
			expireAfterSeconds : 0,
			required : true,
			type : Date
		},

		/* Geo Spatial Coordinates - indexed for Mongo distance searching */
		geo : {
			accuracy : Number,		// 3taps item.location.accuracy

			coordinates: {				// 3taps [item.location.lat, item.location.long]
				index : '2d',
				type : []
			},

			status : Number				// 3taps item.location.geolocation_status
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
		}

	}, {
		strict : false,					// allow additional meta not specified in schema
		toObject : {						// override toObject to clean off Mongo specifics
			transform : function (doc, ret) {
				'use strict';

				delete ret._id;
				delete ret._v;
			}
		},
		versionKey : false			// disable versioning
	});


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	// create mongoose model
	var Posting = mongoose.model('postings', postingSchema);

	function updateFields (original, newer) {
		for (var field in newer) {
			if (typeof newer[field] === 'object' && newer[field]) {
				original[field] = original[field] || {};
				updateFields(original[field], newer[field]);
			} else {
				original[field] = newer[field];
			}
		}

		return original;
	}

	self.find = function (options, callback) {
		var verr;

		Posting
			.find()
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, postings) {
				if (err) {
					verr = new VError(err, 'unable to find postings');
					verr.options = options;

					return callback(verr);
				}

				return callback(null, JSON.parse(JSON.stringify(postings)));
			});
	};

	self.upsert = function (postingId, posting, callback) {
		if (typeof callback === 'undefined' && typeof posting === 'function') {
			callback = posting;
			posting = postingId;
			postingId = posting.postingId;
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
					app.log.trace('creating new posting with postingId %s');

					// create new posting with postingId
					upsertPosting = new Posting();
					upsertPosting.postingId = postingId;
				} else {
					app.log.trace('updating existing posting with postingId %s');

					// ensure postingId remains intact
					delete posting.postingId;
				}

				// update fields
				updateFields(upsertPosting, posting);

				// save it off...
				upsertPosting.save(function (err) {
					if (err) {
						verr = new VError(err, 'save of posting %s failed', postingId);
						return callback(verr);
					}

					// return to caller
					return callback(null, upsertPosting.toObject());
				});
			});
	};

	return self;
};
