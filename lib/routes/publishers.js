var
	fs = require('fs'),
	os = require('os'),
	util = require('util'),

	express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/publishers/ebay');
	app.use('/v1/publishers/ebay', router);

	router.post(
		'/notifications',

		// middleware to read and store the raw XML from the request stream
		function (req, res, next) {
			req.on('data', function (chunk) {
				req.rawBody = req.rawBody || '';
				req.rawBody = [req.rawBody, chunk].join('');
			});

			req.on('end', function () {
				return next();
			})
		},

		// the actual endpoint
		function (req, res) {
			var
				fileBody = [],
				fileName,
				now = new Date();

			fileName = [
				app.config.ebay.notificationsLogPath,
				'/',
				now.getUTCFullYear(),
				(now.getUTCMonth() + 1),
				(now.getUTCDate()),
				(now.getUTCHours()),
				'-',
				(now.getUTCMinutes()),
				(now.getUTCSeconds()),
				(now.getUTCMilliseconds()),
				'.txt'].join('');

			// add request headers to file body
			Object.keys(req.headers).forEach(function (headerName) {
				fileBody.push(
					util.format('%s : %s', headerName, req.headers[headerName]));
			});

			fileBody.push(os.EOL);
			fileBody.push(req.rawBody);

			fs.writeFile(fileName, fileBody.join(os.EOL), function (err) {
				if (err) {
					app.log.error('unable to write Ebay event notification to disk');
					app.log.error(err);
				}

				return res.status(200).send(null);
			});
		});

	return self;
};
