/*
// Example ofer model

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
	user : ''
};
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation');


module.exports = function (app, data, self) {
	'use strict';

	self = self || {};

	/**
	 * Used by the route to create a offer in the API
	 **/
	self.create = function (offer, callback) {
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

		if (validation.isEmpty(offer.postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offer.proposedTimes)) {
			modelError =
				new errors.RequiredFieldMissingError('proposedTimes are required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(offer.user)) {
			modelError =
				new errors.RequiredFieldMissingError('user is required');

			return setImmediate(callback, modelError);
		}

		// create an ID for the offer
		offerId = uuid.v4().replace(/-/g, '');

		app.log.trace('assigning ID %s to offer', offerId);

		// perform insert
		data.offers.upsert(offerId, offer, function (err, newOffer) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to store offer');

				return callback(modelError);
			}

			app.log.trace('create offer %s completed in %s',
				offerId,
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, newOffer);
		});
	};

	/**
	 * Allows for removal of offers
	 **/
	self.delete = function (offerId, callback) {
		var
			modelError,
			offer,
			startTime = new Date();

		async.waterfall([
				async.apply(self.findById, offerId),
				function (foundOffer, done) {
					offer = foundOffer;

					return data.offers.remove(foundOffer.offerId, done);
				}
			], function (err) {
				app.log.trace('delete offer %s completed in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove offer by id');

					modelError.offerId = offerId;
				}

				return callback(modelError, offer);
			});
	};

	/**
	 * Accepts query filter, sort and pagination parameters and uses
	 * data.offers.find to lookup all matching offers.
	 **/
	self.find = function (options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');
			modelError.options = options;

			return setImmediate(callback, modelError);
		}

		data.offers.find(options, function (err, offers) {
			app.log.trace('find offers completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find offers');
				modelError.options = options;

				return callback(modelError);
			}

			// return
			return callback(null, offers);
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
			modelError.offerId = offerId;

			return setImmediate(callback, modelError);
		}

		data.offers.findByOfferId(offerId, function (err, offer) {
			app.log.trace('find offer by ID completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find offer by id');
				modelError.offerId = offerId;
			}

			if (!offer) {
				modelError = new errors.ResourceNotFoundError(
					'no offer exists with specified ID');
				modelError.offerId = offerId;
			}

			// return
			return callback(modelError, offer);
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

		async.waterfall([
				async.apply(self.findById, offerId),
				function (foundOffer, done) {
					return data.offers.upsert(foundOffer.offerId, offer, done);
				}
			], function (err, updatedOffer) {
				app.log.trace('update offer %s completed in %s',
					offerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove offer by id');

					modelError.offerId = offerId;
				}

				return callback(modelError, updatedOffer);
			});
	};

	return self;
};