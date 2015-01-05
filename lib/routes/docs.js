var
	fs = require('fs'),
	path = require('path'),

	aglio = require('aglio'),
	async = require('async'),
	express = require('express'),

	BLUEPRINT_PATH = path.join(__dirname, '../../v1.apibp.md');


	module.exports = function (app) {
		'use strict';

		var
			blueprint,
			router = express.Router();

		app.log.trace('registering routes for /v1/docs');
		app.use('/v1/docs', router);

		function loadBlueprint (callback) {
			if (blueprint) {
				return setImmediate(callback);
			}

			// read blueprint markdown and set variable on resource
			fs.readFile(BLUEPRINT_PATH, { encoding : 'UTF-8' }, function (err, md) {
				if (err) {
					return callback(err);
				}

				app.log.trace('loaded blueprint');

				blueprint = md;
				return callback(null, md, 'default');
			});
		}

		router.get('/', function (req, res, next) {
			async.waterfall([
					loadBlueprint,
					aglio.render
				], function (err, html, warnings) {
					if (err) {
						return next(err);
					}

					// debug warnings in API blueprint markdown
					if (warnings) {
						delete warnings.input;
						app.log.debug(JSON.stringify(warnings, 0, 2));
					}

					return res
						.status(200)
						.send(html);
				});
		});
	};
