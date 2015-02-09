module.exports = (function (self) {
	'use strict';

	self = self || {};

	self.auditFields = function (schema) {
		schema.add({
			deleted : {
				default : false,
				type : Boolean
			},
			createdAt : {
				default : new Date(),
				type : Date
			},
			modifiedAt : {
				default : new Date(),
				type : Date
			}
		});
	};

	self.toObject = function (schema) {
		if (!schema.options.toObject) {
			schema.options.toObject = {};
		}

		// remove mongo _id and _v fields
		schema.options.toObject.transform = function (doc, ret) {
			delete ret._id;
			delete ret._v;
			delete ret.deleted;
		};
	};

	self.updateFields = function (original, newer) {
		// iterate over each property of newer object and set the field
		// on the original -> used for upsert so that if not all fields are
		// supplied (partial update), the original fields are not dereferenced
		for (var field in newer) {
			if (newer[field] && newer[field].constructor === Object) {
				original[field] = original[field] || newer[field];
				self.updateFields(original[field], newer[field]);
			} else {
				original[field] = newer[field] || original[field];
			}
		}

		return original;
	};

	return self;
}());
