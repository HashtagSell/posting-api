/*
// Example offer model

var offer = {
	offerId : '',
	postingId : '',
	proposedTimes : [{
		acceptedAt : '2015-01-31T14:37:00Z',
		when : '2015-02-01T10:00:00Z',
		where : ''
	}, {
		when : '2015-02-02T10:00:00Z',
		where : ''
	}, {
		when : '2015-02-03T10:00:00Z',
		where : ''
	}],
	username : ''
};
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation'),

	SOCKET_CHANNEL = '/postings',
	SOCKET_EVENT_ACCEPT_OFFER = 'accept-offer',
	SOCKET_EVENT_MAKE_OFFER = 'make-offer';


module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	self.acceptOffer = function (offerId, acceptedTime, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(acceptedTime)) {
			modelError =
				new errors.RequiredFieldMissingError('acceptedTime is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(acceptedTime.when) ||
			validation.isEmpty(acceptedTime.where)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'where and when are both required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(acceptedTime.acceptedAt)) {
			acceptedTime.acceptedAt = new Date();
		}

		async.waterfall([
				// find the offer
				async.apply(self.findById, offerId),

				// accept the proposed time for the specified offer
				function (offer, done) {
					var isFound = false;

					// make sure acceptedTime exists
					offer.proposedTimes.some(function (time) {
						isFound =
							new Date(time.when) === new Date(acceptedTime.when) &&
							time.where === acceptedTime.where;

						if (isFound) {
							time.acceptedAt = acceptedTime.acceptedAt;
						}

						return isFound;
					});

					if (isFound) {
						return setImmediate(function () {
							done(null, offer);
						});
					}

					// push the new accepted time to the offer
					// this may not be desired behavior...
					offer.proposedTimes.push(acceptedTime);

					return self.update(offerId, offer, done);
				},

				// lookup the posting...
				function (offer, done) {
					data.postings.findById(offer.postingId, function (err, posting) {
						return done(err, offer, posting);
					});
				}
			],
			function (err, offer, posting) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to accept offer');

					modelError.acceptedTime = acceptedTime;
					modelError.offerId = offerId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('accept offer %s completed in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// emit message on realtime-svc
				services.realtime.emit(
					SOCKET_CHANNEL,
					SOCKET_EVENT_ACCEPT_OFFER,
					{
						acceptedTime : acceptedTime,
						offerId : offer.offerId,
						postingId : offer.postingId,
						username : posting ? posting.username : '',
						timestamp : new Date()
					});

				return callback(null, offer);
			});
	};

	/**
	 * Used by the route to create a offer in the API
	 **/
	self.create = function (postingId, offer, callback) {
		var
			modelError,
			offerId,
			startTime = new Date();

		// validate the input
		if (validation.isEmpty(offer)) {
			modelError =
				new errors.RequiredFieldMissingError('offer payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offer.proposedTimes)) {
			modelError =
				new errors.RequiredFieldMissingError('proposedTimes are required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offer.username)) {
			modelError =
				new errors.RequiredFieldMissingError('username is required');

			return setImmediate(callback, modelError);
		}

		// TODO: validate existence of posting?

		async.waterfall([
				async.apply(data.offers.findByUsername, postingId, offer.username, {}),
				function (foundOffers, done) {
					var existingOffer;

					if (foundOffers.total > 0) {
						existingOffer = foundOffers.results[0];

						// set offerId to the existing offer - avoid duplicate offers
						// from one username - this will result in the proposedTimes
						// being overridden
						offerId = existingOffer.offerId;
					}

					return setImmediate(function () {
						return done(null, typeof existingOffer !== 'undefined');
					});
				},
				function (foundExisting, done) {
					if (!foundExisting) {
						// create an ID for the offer
						offerId = uuid.v4().replace(/-/g, '');

						// assign the postingId
						offer.postingId = postingId;

						app.log.trace('assigning ID %s to offer', offerId);
					} else {
						app.log.trace('updating proposedTimes for offer %s', offerId);
					}

					// perform insert
					data.offers.upsert(offerId, offer, function (err, newOffer) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to store offer');

							return done(modelError);
						}

						app.log.trace('create offer %s completed in %s',
							offerId,
							countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

						// emit message on realtime-svc
						services.realtime.emit(
							SOCKET_CHANNEL,
							SOCKET_EVENT_MAKE_OFFER,
							{
								offerId : newOffer.offerId,
								postingId : newOffer.postingId,
								proposedTimes : newOffer.proposedTimes,
								username : newOffer.username,
								timestamp : new Date()
							});

						// return
						return done(null, newOffer);
					});
				}
			], callback);
	};

	/**
	 * Allows for removal of offers
	 **/
	self.delete = function (offerId, callback) {
		var
			modelError,
			offer,
			startTime = new Date();

		if (validation.isEmpty(offer.offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, offerId),
				function (foundOffer, done) {
					offer = foundOffer;

					return data.offers.remove(foundOffer.offerId, done);
				}
			], function (err) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove offer by id');

					modelError.offerId = offerId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('delete offer %s completed in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, offer);
			});
	};

	/**
	 * Find a specific offer
	 **/
	self.findById = function (offerId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'offerId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.offers.findByOfferId(offerId, function (err, offer) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find offer by id');
				modelError.offerId = offerId;

				return callback(modelError);
			}

			if (!offer) {
				modelError = new errors.ResourceNotFoundError(
					'no offer exists with specified ID');
				modelError.offerId = offerId;

				return callback(modelError);
			}

			app.log.trace('find offer by ID completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, offer);
		});
	};

	/**
	 * Accepts query filter, sort and pagination parameters and uses
	 * data.offers.find to lookup all matching offers.
	 **/
	self.findByPostingId = function (postingId, options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'postingId parameter is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.offers.findByPostingId(postingId, options, function (err, offers) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find offers');
				modelError.options = options;
				modelError.postingId = postingId;

				return callback(modelError);
			}

			app.log.trace('find offers completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, offers);
		});
	};

	/**
	 * Find all offers created by a given user
	 **/
	self.findByUsername = function (username, options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(username)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'username parameter is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.offers.findByUsername(username, options, function (err, offers) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find offers');
				modelError.options = options;
				modelError.username = username;

				return callback(modelError);
			}

			app.log.trace('find offers completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, offers);
		});
	};

	/**
	 * Allows for the update of a offer, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (offerId, offer, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(offer.offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		// ensure offer has a payload
		// ultimately updates modifiedAt on the document when this occurs
		offer = offer || {};

		async.waterfall([
				async.apply(self.findById, offerId),
				function (foundOffer, done) {
					return data.offers.upsert(foundOffer.offerId, offer, done);
				}
			], function (err, updatedOffer) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to update offer by id');

					modelError.offerId = offerId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('update offer %s completed in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, updatedOffer);
			});
	};

	return self;
};
