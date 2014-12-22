module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.isEmpty = function (value) {
		if (value instanceof Date) {
			return false;
		}

		return (typeof value === 'undefined' ||
			(value === null) ||
			(typeof value === 'string' && value === '') ||
			(Array.isArray(value) && !value.length) ||
			(typeof value === 'object' && !Object.keys(value).length));
	};

	return self;
}({}));
