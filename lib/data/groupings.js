var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	groupingsSchema = mongoose.Schema({
		categories : [{
			code : {
				index : {
					unique : true
				},
				required : true,
				type : String
			},
			name : {
				required : true,
				type : String
			}
		}],
		code : {
			index : {
				unique : true
			},
			required : true,
			type : String
		},
		name : {
			required : true,
			type : String
		}
	}, {
		strict : false,					// allow additional meta not specified in schema
		versionKey : false			// disable versioning
	});

module.exports = function (app, self) {
	'use strict';

	self = self || {};

	// extend schema with toObject override
	extensions.toObject(groupingsSchema);

	// create mongoose model
	var Grouping = mongoose.model('groupings', groupingsSchema);

	self.find = function (options, callback) {
		var verr;

		Grouping
			.find()
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, groupings) {
				if (err) {
					verr = new VError(err, 'unable to find groupings');
					verr.options = options;

					return callback(verr);
				}

				return callback(null, JSON.parse(JSON.stringify(groupings)));
			});
	};

	self.findByCode = function (code, callback) {
		var verr;

		Grouping
			.findOne({ code : code })
			.exec(function (err, grouping) {
				if (err) {
					verr = new VError(
						err,
						'findByCode for grouping %s failed',
						code);

					return callback(verr);
				}

				if (!grouping) {
					app.log.trace(
						'no groupings with code %s exist',
						code);

					return callback();
				}

				return callback(null, grouping.toObject({ transform : true }));
			});
	};

	self.findCategoryByCode = function (categoryCode, callback) {
		var verr;

		Grouping
			.findOne({
				'categories.code' : categoryCode
			}, {
				categories : {
					$elemMatch : {
						code : categoryCode
					}
				},
				code : true,
				name : true
			})
			.exec(function (err, grouping) {
				if (err) {
					verr = new VError(
						err,
						'findByCode for category %s failed',
						categoryCode);

					return callback(verr);
				}

				if (!grouping) {
					app.log.trace(
						'no categories with code %s exist',
						categoryCode);

					return callback();
				}

				return callback(null, grouping.toObject({ transform : true }));
			});
	};

	self.remove = function (code, callback) {
		var verr;

		Grouping
			.findOne({ code : code })
			.exec(function (err, grouping) {
				if (err) {
					verr = new VError(err, 'lookup of grouping %s failed', code);
					return callback(verr);
				}

				grouping.remove(function (err) {
					if (err) {
						verr =
							new VError(err, 'removal of grouping %s has failed', code);
						return callback(verr);
					}

					return callback(null, grouping.toObject({ transform : true }));
				});
			});
	};

	self.removeCategory = function (categoryCode, callback) {
		var verr;

		Grouping
			.update({
					'categories.code' : categoryCode
				}, {
					$pull : {
						categories : {
							code : categoryCode
						}
					}
				}, {
					multi : true // any sub-category with this code is removed
				}, function (err, grouping) {
					if (err) {
						verr = new VError(
							err,
							'removal of category %s failed',
							categoryCode);

						return callback(verr);
					}

					return callback(null, grouping.toObject({ transform : true }));
				});
	};

	self.upsert = function (code, grouping, callback) {
		if (typeof callback === 'undefined' && typeof grouping === 'function') {
			callback = grouping;
			grouping = code;
			code = grouping.code || null;
		}

		var verr;

		// attempt to look up a posting with specified ID
		Grouping
			.findOne({ code : code })
			.exec(function (err, upsertGrouping) {
				if (err) {
					verr = new VError(err, 'lookup of grouping %s failed', code);
					return callback(verr);
				}

				// check for insert
				if (!upsertGrouping) {
					app.log.trace('creating new grouping with code %s', code);

					// create new grouping with code
					upsertGrouping = new Grouping();
					upsertGrouping.code = code;
				} else {
					app.log.trace(
						'updating existing grouping with code %s',
						code);

					// ensure grouping code remains intact
					delete grouping.code;
				}

				// update fields
				extensions.updateFields(upsertGrouping, grouping);

				// save it off...
				upsertGrouping.save(function (err) {
					if (err) {
						verr = new VError(err, 'save of grouping %s failed', code);
						return callback(verr);
					}

					// return to caller
					return callback(null, upsertGrouping.toObject({ transform : true }));
				});
			});
	};

	self.upsertCategory = function (code, categoryCode, category, callback) {
		if (typeof callback === 'undefined' && typeof category === 'function') {
			callback = category;
			category = categoryCode;
			categoryCode = category.code || null;
		}

		var
			upsertCategory,
			verr;

		Grouping
			.findOne({ code : code })
			.exec(function (err, grouping) {
				if (err) {
					verr = new VError(err, 'lookup of grouping %s failed', code);
					return callback(verr);
				}

				if (!grouping) {
					app.log.trace(
						'no groupings with code %s exist',
						code);

					return callback();
				}

				// attempt to find match
				grouping.categories.some(function (existingCategory) {
					if (existingCategory.code === categoryCode) {
						upsertCategory = existingCategory;
					}

					return typeof upsertCategory !== 'undefined';
				});

				if (upsertCategory) {
					app.log.trace(
						'updating existing category with code %s',
						categoryCode);

					// update existing category fields
					extensions.updateFields(upsertCategory, category);
				} else {
					app.log.trace('creating new category with code %s', categoryCode);

					// push to categories sub collection
					grouping.categories.push(category);
				}

				// save and exit
				grouping.save(function (err) {
					if (err) {
						verr = new VError(err, 'save of grouping %s failed', code);
						return callback(verr);
					}

					// mimic a similar response to findCategoryByCode
					grouping.categories = [category];

					return callback(null, grouping.toObject({ transform : true }));
				});
			});
	};

	return self;
};
