var
	countdown = require('countdown'),
	request = require('request'),

	DEFAULT_SPOOF_IP_ADDRESS = '216.38.134.18';


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	/**
	 * Return spoofed IP if IP HTTP request headers is localhost or inside IP.
	 * Else return the valid IP
	 **/
	function spoofIfLocal (ipAddress) {
		var
			ipAddressParts = ipAddress.split('.'),
			isLocal = false;

		ipAddressParts.forEach(function (part, i) {
			ipAddressParts[i] = parseInt(part, 10);
		});

		isLocal = (
			(ipAddressParts[0] === 10) ||
			(ipAddressParts[0] === 172 &&
				ipAddressParts[1] >= 16 &&
				ipAddressParts[1] <= 31) ||
			(ipAddressParts[0] === 192 && ipAddressParts[1] === 168));

		if (isLocal) {
			return DEFAULT_SPOOF_IP_ADDRESS;
		}

		return ipAddress;
	};

	/**
	 * Geolocate clientIP via FreeGeoIP
	 * Returns lat and long.
	 **/
	self.locate = function (ipAddress, callback) {
		var url = [app.config.freeGeo.url, ipAddress].join('/');

		request(url, function (err, res, body) {
			if (err) {
				return callback(err);
			}

			if (response.statusCode !== 200) {
				return callback(body);
			}

			app.log.trace(body);

			return callback(null, body);
		});
	};

	return self;
};
