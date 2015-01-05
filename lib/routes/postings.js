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

	router.put('/', function (req, res, next) {
		return next({
				message : 'not implemented',
				statusCode : 501
			});
	});

	router.put('/:postingId', function (req, res, next) {
		return next({
				message : 'not implemented',
				postingId : req.params.postingId,
				statusCode : 501
			});
	});



	return self;
};
