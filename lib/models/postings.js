/*
// Example posting model

var posting = {
	external : {
		source : {
			code : '',										// 3taps item.source
			id : '',											// 3taps item.external_id
			url : ''											// 3taps item.external_url
		},
		threeTaps : {
			id : 1,												// 3taps item.id
			category : '',								// 3taps item.category
			categoryGroup : '',						// 3taps item.category_group
			location : {
				city : '',									// 3taps item.location.city
				country : '',								// 3taps item.location.country
				county : '',								// 3taps item.location.county
				formatted : '',							// 3taps item.location.formatted_address
				locality : '',							// 3taps item.location.locality
				metro : '',									// 3taps item.location.metro
				region : '',								// 3taps item.location.region
				state : '',									// 3taps item.location.state
				zipCode : '',								// 3taps item.location.zipcode
			},
			status : '',									// 3taps item.status
			timestamp : 12345							// 3taps item.timestamp
		}
	},
	annotations : {},									// 3taps item.annotations
	askingPrice : {
		currency : 'USD',								// 3taps item.currency
		value : ''											// 3taps item.price
	},
	createdAt : '2014-12-10T01:00:00Z'	// 3taps item.timestamp
	expiresAt : '2014-12-10T06:29:00Z'	// 3taps item.expires
	geo : {
		accuracy : 0,										// 3taps item.location.accuracy
		coordinates: [0, 0],						// 3taps [item.location.lat, item.location.long]
		status : 0											// 3taps item.location.geolocation_status
	},
	body : 'required',								// 3taps item.body
	heading : 'required',							// 3taps item.heading
	images : {},											// 3taps item.images
	language : 'EN',									// 3taps item.language
	postingId : 'required'						// hashtagsell assigned ID
};
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation'),

	DEFAULT_EXPIRATION_DAYS = 14,
	EXTERNAL_ID_MATCH = /\:/;


module.exports = function (app, data, self) {
	'use strict';

	self = self || {};

	/**
	 * Accepts an object representing a posting, performs some validation on
	 * required fields and coerces the expires field to be a Date (if supplied as
	 * seconds or milliseconds).
	 *
	 * Utilizes the data.postings.upsert to persist the object to the underlying
	 * data store.
	 **/
	/* jshint sub : true */
	function createPosting (posting, callback) {
		var
			modelError,
			postingId,
			startTime = new Date();

		// validate the input
		if (validation.isEmpty(posting.body)) {
			modelError =
				new errors.RequiredFieldMissingError('posting body is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(posting.heading)) {
			modelError =
				new errors.RequiredFieldMissingError('posting heading is required');

			return setImmediate(callback, modelError);
		}

		// create an ID for the posting
		postingId = uuid.v4().replace(/-/g, '');

		app.log.trace('assigning ID %s to posting', postingId);

		// format the posting for the underlying data store
		// this will take a posting in 3taps format and convert it
		posting = mapPosting(posting);

		// TODO: define heuristics to look / search for duplicates

		// TODO: define heuristics to clean up headings

		// ensure data.createdAt is set to a Date
		if (validation.isEmpty(posting.createdAt)) {
			posting.createdAt = new Date();
		} else if (/[0-9]*/.test(posting.createdAt)) {
			app.log.trace(
				'attempting to coerce numeric value of createdAt (%d) to date',
				posting.createdAt);

			// check for seconds
			if (posting.createdAt.toString().length === 10) {
				posting.createdAt = new Date(posting.createdAt * 1000);
			} else {
				posting.createdAt = new Date(posting.createdAt);
			}
		}

		// ensure data.expiresAt is set to a Date
		if (validation.isEmpty(posting.expiresAt) || Number(posting.expiresAt) === 0) {
			app.log.trace(
				'setting default expiration of %d days for posting',
				DEFAULT_EXPIRATION_DAYS);

			posting.expiresAt = new Date(posting.createdAt);
			posting.expiresAt =
				new Date(posting.expiresAt.setDate(
					posting.expiresAt.getDate() + DEFAULT_EXPIRATION_DAYS));
		} else if (/[0-9]*/.test(posting.expiresAt)) {
				app.log.trace(
					'attempting to coerce numeric value of expires (%d) to date',
					posting.expiresAt);

			// check for seconds
			if (posting.expiresAt.toString().length === 10) {
				posting.expiresAt = new Date(posting.expiresAt * 1000);
			} else {
				posting.expiresAt = new Date(posting.expiresAt);
			}
		}

		app.log.trace('posting is set to expire on %s', posting.expiresAt);

		// perform insert
		data.postings.upsert(postingId, posting, function (err, newPosting) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to store posting');

				return callback(modelError);
			}

			app.log.trace('create posting %s completed in %s',
				postingId,
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, newPosting);
		});
	}

	/* jshint sub : true */
	function mapPosting (originalPosting) {
		var posting = {
			askingPrice : {},
			external : {
				source : {},
				threeTaps : {}
			},
			geo : {}
		};

		// make sure we don't lose external info if originally supplied
		if (!validation.isEmpty(originalPosting.external)) {
			posting.external.source = originalPosting.external.source || {};
			posting.external.threeTaps = originalPosting.external.threeTaps || {};
		}

		// map external.source fields
		if (!validation.isEmpty(originalPosting.source)) {
			posting.external.source.code = originalPosting.source;
		}

		if (!validation.isEmpty(originalPosting['external_id'])) {
			posting.external.source.id = originalPosting['external_id'];
		}

		if (!validation.isEmpty(originalPosting['external_url'])) {
			posting.external.source.url = originalPosting['external_url'];
		}

		// map external.threeTaps fields
		if (!validation.isEmpty(originalPosting.id)) {
			posting.external.threeTaps.id = originalPosting.id;
		}

		if (!validation.isEmpty(originalPosting.category)) {
			posting.external.threeTaps.category = originalPosting.category;
		}

		if (!validation.isEmpty(originalPosting['category_group'])) {
			posting.external.threeTaps.categoryGroup = originalPosting['category_group'];
		}

		if (!validation.isEmpty(originalPosting.location)) {
			posting.external.threeTaps.location = {
				city : originalPosting.location.city,
				country : originalPosting.location.country,
				county : originalPosting.location.county,
				formatted : originalPosting.location['formatted_address'],
				locality : originalPosting.location.locality,
				metro : originalPosting.location.metro,
				region : originalPosting.location.region,
				state : originalPosting.location.state,
				zipcode : originalPosting.location.zipcode
			};

			// map geo-spatial fields
			if (!validation.isEmpty(originalPosting.location.accuracy)) {
				posting.geo.accuracy = originalPosting.location.accuracy;
			}

			if (!validation.isEmpty(originalPosting.location.lat) &&
				!validation.isEmpty(originalPosting.location.long)) {
					posting.geo.coordinates = [
						Number(originalPosting.location.lat),
						Number(originalPosting.location.long)];
			}

			if (!validation.isEmpty(originalPosting.location['geolocation_status'])) {
				posting.geo.status = originalPosting.location['geolocation_status'];
			}
		}

		if (!validation.isEmpty(originalPosting.status)) {
			posting.external.threeTaps.status = originalPosting.status;
		}

		if (!validation.isEmpty(originalPosting.timestamp)) {
			posting.external.threeTaps.timestamp = originalPosting.timestamp;
			posting.createdAt = originalPosting.timestamp;
		}

		// map askingPrice fields
		if (!validation.isEmpty(originalPosting.currency)) {
			posting.askingPrice.currency = originalPosting.currency;
		}

		if (!validation.isEmpty(originalPosting.price)) {
			posting.askingPrice.value = originalPosting.price;
		}

		// map the rest
		posting.annotations = originalPosting.annotations;
		posting.expiresAt = originalPosting.expires;
		posting.body = originalPosting.body;
		posting.heading = originalPosting.heading;
		posting.images = originalPosting.images;
		posting.language = originalPosting.language;

		return posting;
	}

	/**
	 * Used by the route to create one or more postings in the API
	 **/
	self.create = function (postings, callback) {
		if (validation.isEmpty(postings)) {
			return setImmediate(
				callback,
				new errors.RequiredFieldMissingError('posting payload is required'));
		}

		if (!Array.isArray(postings)) {
			postings = [postings];
		}

		// create each posting in the array
		return async.map(postings, createPosting, function (err, result) {
			if (err) {
				return callback(err);
			}

			// if only one posting was passed in, return a single result
			if (postings.length === 1) {
				result = result[0];
			}

			return callback(null, result);
		});
	};

	/**
	 * Allows for removal of postings
	 **/
	self.delete = function (postingId, callback) {
		var
			modelError,
			posting,
			startTime = new Date();

		async.waterfall([
				async.apply(self.findById, postingId),
				function (foundPosting, done) {
					posting = foundPosting;
					return data.postings.remove(foundPosting.postingId, done);
				}
			], function (err) {
				app.log.trace('delete posting %s completed in %s',
					postingId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove posting by id');

					modelError.postingId = postingId;
				}

				return callback(modelError, posting);
			});
	};

	/**
	 * Accepts query filter, sort and pagination parameters and uses
	 * data.postings.find to lookup all matching postings.
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

		data.postings.find(options, function (err, postings) {
			app.log.trace('find postings completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find postings');
				modelError.options = options;

				return callback(modelError);
			}

			// return
			return callback(null, postings);
		});
	};

	/**
	 * Find a specific posting
	 **/
	self.findById = function (postingId, callback) {
		var
			externalSource,
			modelError,
			postingIdParts,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'postingId parameter is required');
			modelError.postingId = postingId;

			return setImmediate(callback, modelError);
		}

		// check for an external ID
		if (EXTERNAL_ID_MATCH.test(postingId)) {
			postingIdParts = postingId.split(/\:/);
			externalSource = postingIdParts[0];
			postingId = postingIdParts[1];

			app.log.trace(
				'using externalId %s to lookup posting from %s',
				postingId,
				externalSource);
		}

		data.postings.findById(postingId, externalSource, function (err, posting) {
			app.log.trace('find posting by ID completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find posting by id');
				modelError.postingId = postingId;
				modelError.externalSource = externalSource;
			}

			if (!posting) {
				modelError = new errors.ResourceNotFoundError(
					'no posting exists with specified ID');
				modelError.postingId = postingId;
				modelError.externalSource = externalSource;
			}

			// return
			return callback(modelError, posting);
		});
	};

	/**
	 * Allows for the update of a posting, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (postingId, posting, callback) {
		var
			modelError,
			startTime = new Date();

		async.waterfall([
				async.apply(self.findById, postingId),
				function (foundPosting, done) {
					posting = mapPosting(posting);

					// TODO: any needed verification or data manipulation prior to update

					// use the postingId on the found posting - allows for using
					// aliased IDs (i.e. 3taps:12345) and still update the posting as
					// one would expect
					return data.postings.upsert(foundPosting.postingId, posting, done);
				}
			], function (err, updatedPosting) {
				app.log.trace('update posting %s completed in %s',
					postingId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove posting by id');

					modelError.postingId = postingId;
				}

				return callback(modelError, updatedPosting);
			});
	};

	return self;
};
