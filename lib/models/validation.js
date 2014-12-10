module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.isEmpty = function (value) {
		return (typeof value === 'undefined' ||
			(value === null) ||
			(typeof value === 'string' && value === ''));
	};

	return self;
}({}));
