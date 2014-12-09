var
	version = require('./version');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.initialize = function (app) {
		self.version = version(app);
	};

	return self;
}({}));
