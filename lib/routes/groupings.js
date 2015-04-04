var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/groupings');
	app.use('/v1/groupings', router);

	router.get('/', function (req, res, next) {
		models.groupings.find(req.queryOptions, function (err, groupings) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(groupings);
		});
	});

	router.get('/popular', function (req, res, next) {
		models.groupings.findPopular(req.query.query, function (err, result) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(result);
		});
	});

	router.get('/:code', function (req, res, next) {
		models.groupings.findByCode(req.params.code, function (err, grouping) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(grouping);
		});
	});

	return self;
};
