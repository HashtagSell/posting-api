var
	https = require('https'),

	io = require('socket.io-client');


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	var
		config = app.config.realtime,
		sockets = {};

	function ensureClient (namespace, callback) {
		if (!config.enabled || typeof sockets[namespace] !== 'undefined') {
			return setImmediate(callback);
		}

		app.log.trace('creating socket connection to %s%s', config.url, namespace);

		if (!config.strictSSL) {
			https.globalAgent.options.rejectUnauthorized = false;
		}

		// create client and assign to socket
		sockets[namespace] = io([config.url, namespace].join(''));
		sockets[namespace].once('connect', callback);
		sockets[namespace].on('reconnect', function () {
			app.log.info(
				're-established connectivity with %s%s',
				config.url,
				namespace);
		});
	}

	self.emit = function (namespace, eventName, data, callback) {
		callback = callback || function () {};

		if (!config.enabled) {
			return setImmediate(callback);
		}

		ensureClient(namespace, function () {
			var emitter = sockets[namespace];

			app.log.trace(
				'emitting event %s to namespace %s',
				eventName,
				namespace);

			console.log(data);

			// send event
			emitter.emit(eventName, data);

			// return...
			return callback();
		});
	};

	return self;
};
