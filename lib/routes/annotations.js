var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/annotations');
	app.use('/v1/annotations', router);

	router.get('/', function (req, res) {
		models.annotations.find(
			req.query.query,
			req.query.queryContext,
			function (err, annotations) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(200).json(annotations);
			});
	});

	router.get('/queryContext', function (req, res) {
		models.annotations.getQueryContextList(
			function (err, result) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(200).json(result);
			});
	});

	return self;
};
