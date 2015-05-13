var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	reviewsSchema = mongoose.Schema({
		reviewId : {
			index : {
				unique : true
			},
			required : true,
			type : String
		},
		isBuyer : {
			index : true,
			required : true,
			type : Boolean
		},
		transactionId : {
			index : true,
			required : true,
			type : String
		},
		username : {
			index : true,
			required : true,
			type : String
		},
		value : {
			required : true,
			type : String
		}
	}, {
		strict : false
	});


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	// extend schemas with audit fields and toObject override
	extensions.auditFields(reviewsSchema);
	extensions.toObject(reviewsSchema);

	// create mongoose model
	var Review = mongoose.model('reviews', reviewsSchema);

	self.find = function (options, callback) {
		var verr;

		Review
			.find()
			.lean()
			.filter(options)
			.order(options)
			.page(options, function (err, reviews) {
				if (err) {
					verr = new VError(err, 'unable to find reviews');

					return callback(verr);
				}

				// return
				return callback(
					null,
					extensions.transformPageResults(reviews));
			});
	};

	self.findByReviewId = function (reviewId, callback) {
		var
			query = {
				reviewId : reviewId
			},
			verr;

		Review
			.findOne(query)
			.exec(function (err, review) {
				if (err) {
					verr = new VError(
						err,
						'findByReviewId for review %s failed',
						reviewId);

					return callback(verr);
				}

				if (!review) {
					app.log.trace(
						'no reviews exist with reviewId %s',
						reviewId);

					return callback();
				}

				// return
				return callback(null, review.toObject({ transform : true }));
			});
	};

	self.findByUsername = function (username, options, callback) {
		var
			query = { username : username },
			verr;

		Review
			.find(query)
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, reviews) {
				if (err) {
					verr = new VError(
						err,
						'unable to find reviews for username %s',
						username);

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(reviews));
			});
	};

	self.remove = function (reviewId, callback) {
		var verr;

		Review
			.findOne({ reviewId : reviewId })
			.exec(function (err, review) {
				if (err) {
					verr = new VError(err, 'lookup of review %s failed', reviewId);
					return callback(verr);
				}

				review.remove(function (err) {
					if (err) {
						verr =
							new VError(err, 'removal of review %s has failed', reviewId);
						return callback(verr);
					}

					return callback(null, review.toObject({ transform : true }));
				});
			});
	};

	self.upsert = function (reviewId, review, callback) {
		if (typeof callback === 'undefined' && typeof review === 'function') {
			callback = review;
			review = reviewId;
			reviewId = review.reviewId || null;
		}

		var verr;

		Review
			.findOne({ reviewId : reviewId })
			.exec(function (err, upsertReview) {
				if (err) {
					verr = new VError(
						err,
						'lookup of review %s failed',
						reviewId);

					return callback(verr);
				}

				if (!upsertReview) {
					app.log.trace(
						'create new review with reviewId %s',
						reviewId);

					upsertReview = new Review();
					upsertReview.reviewId = reviewId;
				} else {
					app.log.trace(
						'updating existing review with reviewId %s',
						reviewId);

					// ensure reviewId remains intact
					delete review.reviewId;
				}

				// update failes
				extensions.updateFields(upsertReview, review);

				// ensure modified is properly set
				upsertReview.modifiedAt = new Date();

				upsertReview.save(function (err) {
					if (err) {
						verr = new VError(
							err,
							'save of review %s failed',
							reviewId);
						return callback(verr);
					}

					// return
					return callback(
						null,
						upsertReview.toObject({ transform : true }));
				});
			});
	};

	return self;
};
