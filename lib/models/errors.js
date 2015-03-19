var util = require('util');


module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.GeneralConflictError = function (message) {
		this.name = 'GeneralConflictError';
		this.message = message;
		this.statusCode = 409;
	};

	self.PersistenceError = function (err, message) {
		this.name = 'PersistenceError';
		this.message = message;
		this.sourceError = err;
		this.statusCode = 500;
	};

	self.PublishingError = function (err, message) {
		this.name = 'PublishingError';
		this.message = message;
		this.sourceError = err;
		this.statusCode = 500;
	};

	self.RequiredFieldMissingError = function (message) {
		this.name = 'RequiredFieldMissingError';
		this.message = message;
		this.statusCode = 409;
	};

	self.ResourceNotFoundError = function (message) {
		this.name = 'ResourceNotFoundError';
		this.message = message;
		this.statusCode = 404;
	};

	util.inherits(self.GeneralConflictError, Error);
	util.inherits(self.PersistenceError, Error);
	util.inherits(self.PublishingError, Error);
	util.inherits(self.RequiredFieldMissingError, Error);
	util.inherits(self.ResourceNotFoundError, Error);

	return self;
}({}));
