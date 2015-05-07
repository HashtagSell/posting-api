var
	countdown = require('countdown'),
	request = require('request'),

	DEFAULT_LOOKUP_TIMEOUT = 1000;


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	/**
	 * Return spoofed IP if IP HTTP request headers is localhost or inside IP.
	 * Else return the valid IP
	 **/
	function isLocal (ipAddress) {
		var
			ipAddressParts = ipAddress.split('.'),
			isLocalIP = ipAddress === '127.0.0.1';

		ipAddressParts.forEach(function (part, i) {
			ipAddressParts[i] = parseInt(part, 10);
		});

		if (!isLocalIP) {
			isLocalIP = (
				(ipAddressParts[0] === 10) ||
				(ipAddressParts[0] === 172 &&
					ipAddressParts[1] >= 16 &&
					ipAddressParts[1] <= 31) ||
				(ipAddressParts[0] === 192 && ipAddressParts[1] === 168));
		}

		return isLocalIP;
	}

	/**
	 * Geolocate clientIP via FreeGeoIP
	 * Returns lat and long.
	 **/
	self.locate = function (ipAddress, callback) {
		var
			lookupIP = isLocal(ipAddress) ?
				app.config.freeGeo.defaultAddress :
				ipAddress,
			startTime = new Date(),
			url = [
				app.config.freeGeo.url,
				lookupIP].join('/');

		app.log.info('lookup url: %s', url);

		request({
			timeout : DEFAULT_LOOKUP_TIMEOUT,
			url : url
		}, function (err, res, body) {
			if (err) {
				err.ipAddress = ipAddress;
				err.lookupIP = lookupIP;
				err.message = ['[services.geo.locate]', err.message].join(' ');
				err.url = url;

				return callback(err);
			}

			if (res.statusCode !== 200) {
				return callback(body);
			}

			if (typeof body === 'string') {
				try {
					body = JSON.parse(body);
				} catch (ex) {
					return callback(body);
				}
			}

			app.log.trace(
				'request to geo coords for IP Address %s completed in %s',
				ipAddress,
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			return callback(null, body);
		});
	};

	return self;
};
