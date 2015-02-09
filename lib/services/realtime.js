var io = require('socket.io-emitter');


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	var
		enabled = app.config.data.redis.enabled,
		socket;

	function ensureSocket () {
		if (!enabled) {
			return false;
		}

		if (typeof socket === 'undefined') {
			socket = io({
				host : app.config.data.redis.host,
				port : app.config.data.redis.port
			});
		}

		return true;
	}

	self.emit = function (options, eventName, data) {
		if (!ensureSocket || !socket) {
			return;
		}

		var emitter = socket;

		// set channel if appropriate
		if (typeof options.channel !== 'undefined') {
			emitter = emitter.of(options.channel);
		}

		// set room if appropriate
		if (typeof options.room !== 'undefined') {
			emitter = emitter.to(options.room);
		}

		// send event
		return emitter.emit(eventName, data);
	};

	return self;
};
