var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	offersSchema = mongoose.Schema({
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

		/* Array of proposed times */
		proposedTimes : [{
			acceptedAt : {
				type : Date
			},
			when : {
				required : true,
				type : Date
			},
			where : {
				required : true,
				type : String
			}
		}],

		/* Hashtagsell username */
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

	self.findByOfferId = function (offerId, includeDeleted, callback) {
		if (typeof callback === 'undefined') {
			callback = includeDeleted;
			includeDeleted = false;
		}

		var
			query = {
				offerId : offerId
			},
			verr;

		if (!includeDeleted) {
			query.deleted = false;
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
			.find({ deleted : false, postingId : postingId })
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, offers) {
				if (err) {
					verr = new VError(
						err,
						'unable to find offers for posting %s',
						postingId);
					verr.options = options;

					return callback(verr);
				}

				return callback(null, JSON.parse(JSON.stringify(offers)));
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
				deleted : false,
				username : username
			},
			verr;

		if (postingId) {
			query.postingId = postingId;
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
					verr.options = options;

					return callback(verr);
				}

				return callback(null, JSON.parse(JSON.stringify(offers)));
			});
	};

	self.remove = function (offerId, callback) {
		var verr;

		Offer
			.findOne({ deleted : false, offerId : offerId })
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
			offerId = offer.offerId;
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

					// create new posting with postingId
					upsertOffer = new Offer();
					upsertOffer.offerId = offerId;
				} else {
					app.log.trace(
						'updating existing offer with offerId %s',
						offerId);

					// ensure offerId remains intact
					delete offer.offerId;

					// re-enable the offer
					if (upsertOffer.deleted && typeof offer.deleted === 'undefined') {
						app.log.trace(
							're-enabling existing offer with offerId %s',
							offerId);

						upsertOffer.deleted = false;
					}
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
