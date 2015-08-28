var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/offers');
	app.use('/v1/offers', router);

	router.get('/accepted', function (req, res, next) {
		models.offers.findAcceptedProposalsForNotification(
			req.query.beforeDate,
			req.queryOptions,
			function (err, offers) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(offers);
			});
	});
};
