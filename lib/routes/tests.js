var
	express = require('express'),

	services = {
		amazon : require('../services/amazon'),
		ebay : require('../services/ebay')
	};

/**
 * FOR EVALUATION PURPOSES ONLY - WILL BE REMOVED
 **/
module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	// initialize the services
	services.amazon = services.amazon(app);
	services.ebay = services.ebay(app);

	var router = express.Router();

	app.log.trace('registering routes for /v1/tests');
	app.use('/v1/tests', router);

	router.delete('/ebay/:itemId', function (req, res) {
		services.ebay.end(
			req.params.itemId,
			req.query.reason,
			req.query.siteId,
			function (err, result) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(204).json(result);
			});
	});

	router.get('/amazon/attributes', function (req, res) {
		services.amazon.findProductAttributes(
			req.query.query,
			req.query.queryContext,
			function (err, result) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(200).json(result);
			});
	});

	router.get('/amazon/queryContext', function (req, res) {
		services.amazon.getQueryContextList(
			function (err, result) {
				if (err) {
					return res.status(409).json(err);
				}

				return res.status(200).json(result);
			});
	});

	return self;
};
