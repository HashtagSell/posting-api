var
	express = require('express'),

	services = {
		ebay : require('../services/ebay')
	};

/**
 * FOR EVALUATION PURPOSES ONLY - WILL BE REMOVED
 **/
module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	// initialize the services
	services.ebay = services.ebay(app);

	var router = express.Router();

	app.log.trace('registering routes for /v1/tests');
	app.use('/v1/tests', router);

	router.delete('/ebay/:itemId', function (req, res) {
		services.ebay.end(
			req.params.itemId,
			req.query.reason,
			req.query.siteId,
			req.query.token,
			function (err, result) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(204).json(result);
			});
	});

	router.get('/ebay/categories', function (req, res) {
		services.ebay.suggestedCategories(
			req.query.query,
			req.query.siteId,
			function (err, result) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(204).json(result);
			});
	});

	return self;
};
