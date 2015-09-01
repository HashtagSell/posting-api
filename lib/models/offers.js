/*
// Example offer model

var offer = {
    offerId : 'abc123',
    postingId : 'zyx321',
    proposals : [{
        acceptedAt : '2015-01-31T14:37:00Z',
        comment : '',
        isOwnerReply : false, // when the owner of the item replies, this should be set to true
        price : {
            currency : 'USD',
            value : '11.00'
        },
        when : '2015-02-03T10:00:00Z',
        where : 'San Francisco Library'
    }, {
        comment : '$10 is too low',
        isOwnerReply : true,
        price : {
            currency : 'USD',
            value : '12.00'
        },
        when : '2015-02-03T10:00:00Z',
        where : 'San Francisco Library'
    }, {
        comment : '',
        isOwnerReply : false,
        price : {
            currency : 'USD',
            value : '10.00'
        },
        when : '2015-02-03T10:00:00Z',
        where : 'San Francisco Library'
    }],
    username : 'brozeph' // the user who created this offer
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
	SOCKET_EVENT_DECLINE_OFFER = 'decline-offer',
	SOCKET_EVENT_MAKE_OFFER = 'make-offer',
	SOCKET_EVENT_UPDATE_OFFER = 'update-offer';


module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	self.acceptOffer = function (postingId, offerId, acceptedProposal, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(acceptedProposal)) {
			modelError =
				new errors.RequiredFieldMissingError('acceptedProposal is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(acceptedProposal.price)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'accepted price is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(acceptedProposal.when)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'when is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(acceptedProposal.where)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'where is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(acceptedProposal.acceptedAt)) {
			acceptedProposal.acceptedAt = new Date();
		}

		async.waterfall([
				// find the offer
				async.apply(self.findById, postingId, offerId),

				// ensure the offer only has one accepted proposal
				function (offer, done) {
					var isAccepted = false;

					offer.proposals.some(function (proposal) {
						isAccepted = typeof proposal.acceptedAt !== 'undefined';

						return isAccepted;
					});

					// verify if the offer has been accepted
					if (isAccepted) {
						return setImmediate(done,
							new errors.GeneralConflictError(
								'a proposal has already been accepted'));
					}

					// head to the next step...
					return setImmediate(function () {
						return done(null, offer);
					});
				},

				// accept the proposal for the specified offer
				function (offer, done) {
					var isFound = false;

					// make sure acceptedTime exists
					offer.proposals.some(function (proposal) {
						isFound =
							proposal.price === acceptedProposal.price &&
							Number(proposal.when) === Number(new Date(acceptedProposal.when)) &&
							proposal.where === acceptedProposal.where;

						if (isFound) {
							proposal.acceptedAt = acceptedProposal.acceptedAt;
						}

						return isFound;
					});

					if (!isFound) {
						// push the new accepted proposal to the offer
						// this may not be desired behavior...
						offer.proposals.push(acceptedProposal);
					}

					// update the offer to save the acceptedTime
					return self.update(postingId, offerId, offer, done);
				},

				// lookup the posting...
				function (offer, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for offer accepted',
								postingId);
						}

						return done(err, offer, posting);
					});
				}
			],
			function (err, offer, posting) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to accept offer proposal');

					modelError.acceptedProposal = acceptedProposal;
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
						offer : offer,
						posting : posting,
						username : offer.username,
						timestamp : new Date()
					});

				services.notifications.queue(
					SOCKET_EVENT_ACCEPT_OFFER,
					{
						posting: posting,
						offer: offer,
						username: offer.username,
						timestamp: new Date()
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

		if (validation.isEmpty(offer.proposals)) {
			modelError =
				new errors.RequiredFieldMissingError('proposals are required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offer.username)) {
			modelError =
				new errors.RequiredFieldMissingError('username is required');

			return setImmediate(callback, modelError);
		}

		// TODO: validate existence of posting?

		async.waterfall([
			// attempt find an existing matching offer if one exists
				async.apply(data.offers.findByUsername, postingId, offer.username, {}),
				function (foundOffers, done) {
					var existingOffer;

					if (foundOffers.total > 0) {
						existingOffer = foundOffers.results[0];

						// set offerId to the existing offer - avoid duplicate offers
						// from one username - this will result in the proposals
						// being overridden
						offerId = existingOffer.offerId;
					}

					return setImmediate(function () {
						return done(null, typeof existingOffer !== 'undefined');
					});
				},

				// lookup the posting...
				function (foundExisting, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for offer',
								postingId);
						}

						return done(err, foundExisting, posting);
					});
				},

				function (foundExisting, posting, done) {
					if (!foundExisting) {
						// create an ID for the offer
						offerId = uuid.v4().replace(/-/g, '');

						// assign the postingId
						offer.postingId = postingId;

						app.log.trace('assigning ID %s to offer', offerId);
					} else {
						app.log.trace('updating proposals for offer %s', offerId);
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

						// emit message on **-svc
						services.realtime.emit(
							SOCKET_CHANNEL,
							SOCKET_EVENT_MAKE_OFFER,
							{
								offer : newOffer,
								posting : posting,
								username : newOffer.username,
								timestamp : new Date()
							});

						services.notifications.queue(
							SOCKET_EVENT_MAKE_OFFER,
							{
								posting: posting,
								offer: newOffer,
								username: newOffer.username,
								timestamp: new Date()
							});

						// return
						return done(null, newOffer);
					});
				}
			], callback);
	};

	self.createProposal = function (postingId, offerId, newProposal, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(newProposal)) {
			modelError =
				new errors.RequiredFieldMissingError('proposal is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(newProposal.price)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'accepted price is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(newProposal.when)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'when is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(newProposal.where)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'where is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				// find the offer
				async.apply(self.findById, postingId, offerId),

				// ensure uniqueness of the proposal for the specified offer
				function (offer, done) {
					var isFound = false;

					// make sure acceptedTime exists
					offer.proposals.some(function (proposal) {
						isFound =
							proposal.price === newProposal.price &&
							Number(proposal.when) === Number(new Date(newProposal.when)) &&
							proposal.where === newProposal.where;

						return isFound;
					});

					if (!isFound) {
						// push the new proposal to the offer
						offer.proposals.push(newProposal);

						// update the offer to save the new proposal
						return self.update(postingId, offerId, offer, done);
					}

					// move to the next step
					return setImmediate(function () {
						return done(null, offer);
					});
				},

				// lookup the posting...
				function (offer, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for offer accepted',
								postingId);
						}

						return done(err, offer, posting);
					});
				}
			],
			function (err, offer, posting) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to create new offer proposal');

					modelError.proposal = newProposal;
					modelError.offerId = offerId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('new proposal for offer %s created in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// emit message on realtime-svc
				services.realtime.emit(
					SOCKET_CHANNEL,
					SOCKET_EVENT_UPDATE_OFFER,
					{
						offer : offer,
						posting : posting,
						username : offer.username,
						timestamp : new Date()
					});

				return callback(null, offer);
			});
	};

	/**
	 * Allows for removal of offers
	 **/
	self.delete = function (postingId, offerId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, postingId, offerId),
				function (foundOffer, done) {
					return data.offers.remove(foundOffer.offerId, done);
				},

				// lookup the posting...
				function (removedOffer, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for offer',
								postingId);
						}

						return done(err, removedOffer, posting);
					});
				},
			], function (err, removedOffer, posting) {
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

				// emit message on realtime-svc
				services.realtime.emit(
					SOCKET_CHANNEL,
					SOCKET_EVENT_DECLINE_OFFER,
					{
						offerId : removedOffer.offerId,
						posting : posting,
						username : removedOffer.username,
						timestamp : new Date()
					});

				return callback(null, removedOffer);
			});
	};

	/**
	 * Find a specific offer
	 **/
	self.findById = function (postingId, offerId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'offerId parameter is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'postingId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.offers.findByOfferId(postingId, offerId, function (err, offer) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find offer by id');
				modelError.offerId = offerId;
				modelError.postingId = postingId;

				return callback(modelError);
			}

			if (!offer) {
				modelError = new errors.ResourceNotFoundError(
					'no offer exists with specified IDs');
				modelError.offerId = offerId;
				modelError.postingId = postingId;

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
	 * Find orders with accepted proposals for notifications
	 **/
	self.findProposalsForFeedback = function (beforeDate, options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(beforeDate)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'beforeDate parameter is required');

			return setImmediate(callback, modelError);
		}

		// parse beforeDate
		if (!(beforeDate instanceof Date)) {
			beforeDate = new Date(beforeDate);
			app.log.trace('parsing beforeDate %s', beforeDate);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.offers.findProposalsForFeedback(
			beforeDate,
			options,
			function (err, offers) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find offers for feedback');
					modelError.beforeDate = beforeDate;
					modelError.options = options;

					return callback(modelError);
				}

				app.log.trace('find offers for feedback completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, offers);
			});
	};

	/**
	 * Find orders with accepted proposals for notifications
	 **/
	self.findProposalsForNotification = function (beforeDate, options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(beforeDate)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'beforeDate parameter is required');

			return setImmediate(callback, modelError);
		}

		// parse beforeDate
		if (!(beforeDate instanceof Date)) {
			beforeDate = new Date(beforeDate);
			app.log.trace('parsing beforeDate %s', beforeDate);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.offers.findProposalsForNotification(
			beforeDate,
			options,
			function (err, offers) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find offers with accepted proposals');
					modelError.beforeDate = beforeDate;
					modelError.options = options;

					return callback(modelError);
				}

				app.log.trace('find offers with accepted proposals completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, offers);
			});
	};

	/**
	 * Allows for any accepted proposals to be unaccepted
	 **/
	self.unacceptOffer = function (postingId, offerId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'postingId parameter is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				// find the offer
				async.apply(self.findById, postingId, offerId),

				// remove all acceptedAt fields
				function (offer, done) {
					offer.proposals.forEach(function (proposal) {
						if (typeof proposal.acceptedAt !== 'undefined') {
							proposal.acceptedAt = undefined;
						}
					});

					// update the offer
					return self.update(postingId, offerId, offer, done);
				}
			],
			function (err, offer) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to unaccept offer');

					modelError.offerId = offerId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('unaccept offer %s completed in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, offer);
			});
	};

	/**
	 * Allows for the update of a offer, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (postingId, offerId, offer, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		// ensure offer has a payload
		// ultimately updates modifiedAt on the document when this occurs
		offer = offer || {};

		async.waterfall([
				async.apply(self.findById, postingId, offerId),
				function (foundOffer, done) {
					return data.offers.upsert(foundOffer.offerId, offer, done);
				},
				// lookup the posting...
				function (updatedOffer, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for updated offer',
								postingId);
						}

						return done(err, updatedOffer, posting);
					});
				}
			], function (err, updatedOffer, posting) {
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


				//TODO: This update function is triggered when a buyer OR a seller submit a counter-proposal in the UI. If a buyer triggers this update function then the seller should be notified, if the seller triggers this update function then the buyer should be notified.
				// emit message on realtime-svc
				services.realtime.emit(
					SOCKET_CHANNEL,
					SOCKET_EVENT_UPDATE_OFFER,
					{
						offer : updatedOffer,
						posting : posting,
						username : updatedOffer.username,
						timestamp : new Date()
					});

				services.notifications.queue(
					SOCKET_EVENT_UPDATE_OFFER,
					{
						posting: posting,
						offer: updatedOffer,
						username: updatedOffer.username,
						timestamp: new Date()
					});

				return callback(null, updatedOffer);
			});
	};

	return self;
};
