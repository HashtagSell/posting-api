var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	offersSchema = mongoose.Schema({
		/* When a feedback request was sent after purchase */
		feedbackRequestedAt : {
			required : false,
			type : Date
		},

		/* Hashtagsell offer ID */
		offerId : {
			index : {
				unique : true
			},
			required : true,
			type : String
		},

		/* Hashtagsell posting ID */
		postingId : {
			index : true,
			required : true,
			type : String
		},

		/* Array of proposed prices, locations and times */
		proposals : [{
			acceptedAt : {
				type : Date
			},
			comment : {
				required : false,
				type : String
			},
			isOwnerReply : {
				default : false,
				required : true,
				type : Boolean
			},
			price : {
				currency : {
					default : 'USD',
					type : String
				},
				value : {
					default : '0.00',
					required : true,
					type : String
				}
			},
			when : {
				required : true,
				type : Array
			},
			where : {
				required : true,
				type : String
			}
		}],

		/* Denotes when a notification was sent */
		remindedAt : {
			required : false,
			type : Date
		},

		/* Hashtagsell username that originated the offer */
		username : {
			index : true,
			required : true,
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
	extensions.auditFields(offersSchema);
	extensions.toObject(offersSchema);

	// create mongoose model
	var Offer = mongoose.model('offers', offersSchema);

	self.findByOfferId = function (postingId, offerId, callback) {
		// verify case when postingId is not supplied
		if (typeof callback === 'undefined' &&
			typeof offerId === 'function') {
			callback = offerId;
			offerId = postingId;
			postingId = undefined;
		}

		var
			query = {
				offerId : offerId
			},
			verr;

		// apply posting Id if supplied as argument
		if (postingId) {
			query.postingId = postingId;
		}

		Offer
			.findOne(query)
			.exec(function (err, offer) {
				if (err) {
					verr = new VError(
						err,
						'findByOfferId for offer %s failed',
						offerId);

					return callback(verr);
				}

				if (!offer) {
					app.log.trace(
						'no offers with offerId %s exist',
						offerId);

					return callback();
				}

				return callback(null, offer.toObject({ transform : true }));
			});
	};

	self.findByPostingId = function (postingId, options, callback) {
		var verr;

		Offer
			.find({ postingId : postingId })
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, offers) {
				if (err) {
					verr = new VError(
						err,
						'unable to find offers for posting %s',
						postingId);

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(offers));
			});
	};

	self.findByUsername = function (postingId, username, options, callback) {
		if (typeof callback === 'undefined' && typeof options === 'function') {
			callback = options;
			options = username;
			username = postingId;
			postingId = null;
		}

		var
			query = {
				username : username
			},
			verr;

		if (postingId) {
			query.postingId = postingId;
		}

		// check to see if questions should be limited to those with answers
		if (options.excludeNotAccepted) {
			query.proposedTimes = query.proposedTimes || {};

			query.proposedTimes.$elemMatch = {
				acceptedAt : {
					$exists : true
				}
			};

			delete options.excludeNotAccepted;
		}

		// check to see if a date based query is necessary
		if (options.from) {
			query.proposedTimes = query.proposedTimes || {};

			query.answers.$elemMatch = {
				acceptedAt : {
					$gte : new Date(options.from)
				}
			};

			delete options.from;
		}

		Offer
			.find(query)
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, offers) {
				if (err) {
					verr = new VError(
						err,
						'unable to find offers for username %s',
						username);

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(offers));
			});
	};

	self.findProposalsForFeedback = function (afterDate, options, callback) {
		var
			query = {
				feedbackRequestedAt : {
					'$exists' : false
				},
				'proposals.acceptedAt': {
					'$exists' : true,
					'$gte' : afterDate
				},
				remindedAt : {
					'$exists' : true
				}
			},
			verr;

		Offer
			.find(query)
			.lean()
			.filter(options)
			.order(options)
			.page(options, function (err, offers) {
				if (err) {
					verr = new VError(
						err,
						'unable to find accepted offers on or after %s',
						afterDate);

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(offers));
			});
	};

	self.findProposalsForNotification = function (beforeDate, options, callback) {
		var
			query = {
				'proposals.acceptedAt': {
					'$exists' : true,
					'$lte' : beforeDate
				},
				remindedAt : {
					'$exists' : false
				}
			},
			verr;

		Offer
			.find(query)
			.lean()
			.filter(options)
			.order(options)
			.page(options, function (err, offers) {
				if (err) {
					verr = new VError(
						err,
						'unable to find accepted offers on or before %s',
						beforeDate);

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(offers));
			});
	};

	self.remove = function (offerId, callback) {
		var verr;

		Offer
			.findOne({ offerId : offerId })
			.exec(function (err, offer) {
				if (err) {
					verr = new VError(err, 'lookup of offer %s failed', offerId);
					return callback(verr);
				}

				offer.remove(function (err) {
					if (err) {
						verr =
							new VError(err, 'removal of offer %s has failed', offerId);
						return callback(verr);
					}

					return callback(null, offer.toObject({ transform : true }));
				});
			});
	};

	self.upsert = function (offerId, offer, callback) {
		if (typeof callback === 'undefined' && typeof offer === 'function') {
			callback = offer;
			offer = offerId;
			offerId = offer.offerId || null;
		}

		var verr;

		// attempt to look up a posting with specified ID
		Offer
			.findOne({ offerId : offerId })
			.exec(function (err, upsertOffer) {
				if (err) {
					verr = new VError(err, 'lookup of offer %s failed', offerId);
					return callback(verr);
				}

				// check for insert
				if (!upsertOffer) {
					app.log.trace('creating new offer with offerId %s', offerId);

					// create new offer with offerId
					upsertOffer = new Offer();
					upsertOffer.offerId = offerId;
				} else {
					app.log.trace(
						'updating existing offer with offerId %s',
						offerId);

					// ensure offerId remains intact
					delete offer.offerId;
				}

				// update fields
				extensions.updateFields(upsertOffer, offer);

				// ensure modified is properly set
				upsertOffer.modifiedAt = new Date();

				// save it off...
				upsertOffer.save(function (err) {
					if (err) {
						verr = new VError(err, 'save of offer %s failed', offerId);
						return callback(verr);
					}

					// return to caller
					return callback(null, upsertOffer.toObject({ transform : true }));
				});
			});
	};

	return self;
};
