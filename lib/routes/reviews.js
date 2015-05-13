var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/reviews');
	app.use('/v1/reviews', router);

	router.get('/', function (req, res, next) {
		models.reviews.find(
			req.queryOptions,
			function (err, reviews) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(reviews);
			});
	});

	router.get('/:reviewId', function (req, res, next) {
		models.reviews.findById(
			req.params.reviewId,
			function (err, review) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(review);
			});
	});

	/**
	 * Creates a new review with body data
	 **/
	router.post('/', function (req, res, next) {
		models.reviews.create(req.body, function (err, review) {
			if (err) {
				return next(err);
			}

			return res.status(201).json(review);
		});
	});

	/**
	 * Update a review
	 **/
	router.put('/:reviewId', function (req, res, next) {
		models.reviews.update(
			req.params.reviewId,
			req.body,
			function (err, review) {
				if (err) {
					return next(err);
				}

				return res.status(202).json(review);
			});
	});

	router.delete('/:reviewId', function (req, res, next) {
		models.reviews.delete(
			req.params.reviewId,
			function (err, review) {
				if (err) {
					return next(err);
				}

				return res.status(204).json(review);
			});
	});
};
