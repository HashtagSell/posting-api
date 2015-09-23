/*
// Example review model

{
  "reviewId" : "def456",
  "createdAt" : "2015-05-08T09:24.000Z", // system managed
  "modifiedAt" : "2015-05-08T09:24.000Z", // system managed
  "isBuyer" : true,
  "transactionId" : "abc123",
  "username" : "that1guy",
  "rating" : "5"
  "comment" : "A++ would buy again!"
}
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation');

module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	/**
	 * Used by the route to create a review in the API
	 **/
	self.create = function (review, callback) {
		var
			modelError,
			reviewId,
			startTime = new Date();

		// validate the input
		if (validation.isEmpty(review)) {
			modelError =
				new errors.RequiredFieldMissingError('review payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(review.isBuyer)) {
			modelError =
				new errors.RequiredFieldMissingError('isBuyer is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(review.transactionId)) {
			modelError =
				new errors.RequiredFieldMissingError('transactionId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(review.username)) {
			modelError =
				new errors.RequiredFieldMissingError('username is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(review.rating)) {
			modelError =
				new errors.RequiredFieldMissingError('Please provide a rating');

			return setImmediate(callback, modelError);
		}

		// default values if not supplied
		if (validation.isEmpty(review.isExchanged)) {
			review.isExchanged = false;
		}

		async.waterfall([

				// lookup the transaction...
				function (done) {
					data.transactions.findByTransactionId(
						review.transactionId,
						function (err, transaction) {
							if (!transaction) {
								modelError = new errors.ResourceNotFoundError(
									'no transaction exists with specified transactionId');
									modelError.review = review;

								return done(modelError);
							}

							return done(null, transaction);
						});
				},

				// look up existing reviews for the transaction...
				function (transaction, done) {
					data.reviews.findByTransactionId(
						transaction.transactionId,
						function (err, existingReviews) {
							// check to see if user has already reviewed this transaction
							if (existingReviews) {
								existingReviews.forEach(function (existingReview) {
									if (existingReviews.username === review.username) {
										modelError = new errors.GeneralConflictError(
											'review by user for specified transaction already exists');
										modelError.review = review;
										modelError.existingReview = existingReview;

										return setImmediate(done, modelError);
									}
								});
							}

							return setImmediate(done);
						});
				},

				// store review in database
				function (done) {
					// create an ID for the review
					reviewId = uuid.v4().replace(/-/g, '');

					app.log.trace('creating review %s with status of %s',
						reviewId,
						review.status);

					// perform insert
					data.reviews.upsert(
						reviewId,
						review,
						function (err, newReview) {
							if (err) {
								modelError = new errors.PersistenceError(
									err,
									'unable to store review');
								modelError.review = review;

								return done(modelError);
							}

							app.log.trace('create review %s completed in %s',
								reviewId,
								countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

							// return
							return done(null, newReview);
						});
				},

				// if isExchanged, remove the posting from the search index
				function (newReview, done) {
					if (!newReview.isExchanged) {
						return setImmediate(function () {
							return done(null, newReview);
						});
					}

					// remove the posting
					data.postings.remove(newReview.postingId, function (err) {
						if (err) {
							return done(err);
						}

						return done(null, newReview);
					});
				}
			], callback);
	};

	/**
	 * Allows for removal of reviews
	 **/
	self.delete = function (reviewId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(reviewId)) {
			modelError =
				new errors.RequiredFieldMissingError('reviewId is required');

			return setImmediate(callback, modelError);
		}

		data.reviews.remove(reviewId, function (err, removedReview) {
			if (err) {
				return callback(err);
			}

			if (!removedReview) {
				modelError = new errors.ResourceNotFoundError(
					'unable to find review with specified reviewId');
				modelError.reviewId = reviewId;

				return callback(modelError);
			}

			app.log.trace('delete review %s completed in %s',
				reviewId,
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			return callback(null, removedReview);
		});
	};

	/**
	 * Find reviews with filters
	 **/
	self.find = function (options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.reviews.find(options, function (err, reviews) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find reviews');
				modelError.options = options;

				return callback(modelError);
			}

			app.log.trace('find reviews completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, reviews);
		});
	};

	/**
	 * Find a specific review
	 **/
	self.findById = function (reviewId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(reviewId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'reviewId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.reviews.findByReviewId(
			reviewId,
			function (err, review) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find review by id');
					modelError.reviewId = reviewId;

					return callback(modelError);
				}

				if (!review) {
					modelError = new errors.ResourceNotFoundError(
						'no review exists with specified IDs');
					modelError.reviewId = reviewId;

					return callback(modelError);
				}

				app.log.trace('find review by ID completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, review);
			});
	};

	/**
	 * Find reviews by transaction
	 **/
	self.findByTransactionId = function (transactionId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(transactionId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'transactionId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.reviews.findByTransactionId(
			transactionId,
			function (err, reviews) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find reviews by transactionId');
					modelError.transactionId = transactionId;

					return callback(modelError);
				}

				app.log.trace('find reviews by transactionId completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, reviews);
			});
	};

	/**
	 * Find reviews by transaction
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

		data.reviews.findByUsername(username, options, function (err, reviews) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find reviews');
				modelError.options = options;
				modelError.username = username;

				return callback(modelError);
			}

			app.log.trace('find reviews completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, reviews);
		});
	};

	/**
	 * Allows for the update of a review, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (reviewId, review, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(reviewId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'reviewId parameter is required');

			return setImmediate(callback, modelError);
		}

		// default review if is not supplied
		// results in modifiedAt being updated, ultimately
		review = review || {};

		async.waterfall([
				async.apply(self.findById, reviewId),
				function (foundReview, done) {
					return data.reviews.upsert(
						foundReview.reviewId,
						review,
						done);
				}
			], function (err, updatedReview) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to update review by id');
					modelError.reviewId = reviewId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('update review %s completed in %s',
					reviewId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, updatedReview);
			});
	};

	return self;
};
