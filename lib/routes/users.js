var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/users');
	app.use('/v1/users', router);

	router.get('/', function (req, res, next) {
		return next(new Error('not implemented'));
	});

	router.get('/:username', function (req, res, next) {
			return next(new Error('not implemented'));
	});

	app.log.trace('registering routes for /v1/users/:username/offers');

	router.get('/:username/offers', function (req, res, next) {
		models.offers.findByUsername(
			req.params.username,
			req.queryOptions,
			function (err, offers) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(offers);
			});
	});

	app.log.trace('registering routes for /v1/users/:username/questions');

	router.get('/:username/questions', function (req, res, next) {
		models.questions.findByUsername(
			req.params.username,
			req.queryOptions,
			function (err, offers) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(offers);
			});
	});
};