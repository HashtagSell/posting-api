var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/postings');
	app.use('/v1/postings', router);

	router.delete('/:postingId', function (req, res, next) {
		return res
			.status(501)
			.json({
				message : 'not implemented',
				postingId : req.params.postingId,
				statusCode : 501
			});
	});

	router.get('/', function (req, res, next) {
		return res
			.status(501)
			.json({
				message : 'not implemented',
				statusCode : 501
			});
	});

	router.get('/:postingId', function (req, res, next) {
		return res
			.status(501)
			.json({
				message : 'not implemented',
				postingId : req.params.postingId,
				statusCode : 501
			});
	});

	router.post('/', function (req, res, next) {
		return res
			.status(501)
			.json({
				message : 'not implemented',
				statusCode : 501
			});
	});

	router.put('/', function (req, res, next) {
		return res
			.status(501)
			.json({
				message : 'not implemented',
				statusCode : 501
			});
	});

	router.put('/:postingId', function (req, res, next) {
		return res
			.status(501)
			.json({
				message : 'not implemented',
				postingId : req.params.postingId,
				statusCode : 501
			});
	});



	return self;
};
