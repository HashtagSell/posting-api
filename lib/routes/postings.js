var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/postings');
	app.use('/v1/postings', router);

	router.delete('/:postingId', function (req, res, next) {
		return next({
				message : 'not implemented',
				postingId : req.params.postingId,
				statusCode : 501
			});
	});

	router.get('/', function (req, res, next) {
		models.postings.find(req.queryOptions, function (err, postings) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(postings);
		});
	});

	router.get('/:postingId', function (req, res, next) {
		models.postings.findById(req.params.postingId, function (err, posting) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(posting);
		});
	});

	/**
	 * Creates a new posting with body data
	 **/
	router.post('/', function (req, res, next) {
		models.postings.create(req.body, function (err, posting) {
			if (err) {
				return next(err);
			}

			return res.status(201).json(posting);
		});
	});

	router.put('/:postingId', function (req, res, next) {
		models.postings.update(
			req.params.postingId,
			req.body,
			function (err, posting) {
				if (err) {
					return next(err);
				}

				return res.status(202).json(posting);
			});
	});

	app.log.trace('registering routes for /v1/postings/:postingId/offers');

	router.delete('/:postingId/offers/:offerId', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.get('/:postingId/offers', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.get('/:postingId/offers/:offerId', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.post('/:postingId/offers', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	/**
	 * WARNING: NON-STANDARD RESOURCE!!!
	 *
	 * Exists to make client code more simple for the case of confirming a
	 * proposed time to meet.
	 **/
	router.post('/:postingId/offers/:offerId/accept', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.put('/:postingId/offers/:offerId', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	app.log.trace('registering routes for /v1/postings/:postingId/questions');

	router.delete('/:postingId/questions/:questionId', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.get('/:postingId/questions', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.get('/:postingId/questions/:questionId', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.post('/:postingId/questions', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	router.put('/:postingId/questions/:questionId', function (req, res, next) {
		return next({
			message : 'not implemented yet',
			name : 'NotImplementedError',
			statusCode : 501
		});
	});

	app.log.trace(
		'registering routes for /v1/postings/:postingId/questions/:questionId/answers');

	router.delete(
		'/v1/postings/:postingId/questions/:questionId/answers/:answerId',
		function (req, res, next) {
			return next({
				message : 'not implemented yet',
				name : 'NotImplementedError',
				statusCode : 501
			});
		});

	router.post(
		'/v1/postings/:postingId/questions/:questionId/answers',
		function (req, res, next) {
			return next({
				message : 'not implemented yet',
				name : 'NotImplementedError',
				statusCode : 501
			});
		});

	return self;
};
