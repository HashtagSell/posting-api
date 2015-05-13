module.exports = (function (self) {
	'use strict';

	self = self || {};

	function transform (doc, ret) {
		if (typeof ret === 'undefined') {
			ret = JSON.parse(JSON.stringify(doc));
		}

		delete ret._id;
		delete ret._v;

		return ret;
	}

	self.auditFields = function (schema) {
		schema.add({
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
		schema.options.toObject.transform = transform;
	};

	self.updateFields = function (original, newer) {
		// ensure original is not undefined or null
		original = original || {};

		// iterate over each property of newer object and set the field
		// on the original -> used for upsert so that if not all fields are
		// supplied (partial update), the original fields are not dereferenced
		for (var field in newer) {
			if (newer.hasOwnProperty(field)) {
				if (typeof newer[field] !== 'undefined' &&
					newer[field].constructor === Object) {
					original[field] = original[field] || newer[field];
					self.updateFields(original[field], newer[field]);
				} else {
					original[field] = typeof newer[field] !== 'undefined' ?
						newer[field] :
						original[field];
				}
			}
		}

		return original;
	};

	self.transformPageResults = function (page) {
		if (typeof page.results === 'undefined') {
			return page;
		}

		// transform each item to an object
		page.results.forEach(function (item, i) {
			page.results[i] = transform(item);
		});

		return page;
	};

	return self;
}());
