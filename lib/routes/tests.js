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

	// initialize the ebay service
	services.ebay = services.ebay(app);

	var router = express.Router();

	app.log.trace('registering routes for /v1/tests');
	app.use('/v1/tests', router);

	router.delete('/ebay/:itemId', function (req, res, next) {
		services.ebay.end(
			req.params.itemId,
			req.query.reason,
			req.query.siteId,
			function (err, result) {
				if (err) {
					return next(err);
				}

				app.log.trace(result);

				return res.status(204).json(result);
			});
	});

	return self;
};
