/*
// Example posting model

var posting = {
	external : {
		source : {
			code : '',										// 3taps item.source
			id : '',											// 3taps item.external_id
			url : ''											// 3taps item.external_url
		},
		threeTaps : {
			id : 1,												// 3taps item.id
			category : '',								// 3taps item.category
			categoryGroup : '',						// 3taps item.category_group
			location : {
				city : '',									// 3taps item.location.city
				country : '',								// 3taps item.location.country
				county : '',								// 3taps item.location.county
				locality : '',							// 3taps item.location.locality
				metro : '',									// 3taps item.location.locality
				region : '',								// 3taps item.location.locality
				state : '',									// 3taps item.location.locality
				zipCode : '',								// 3taps item.location.zipcode
			},
			status : '',									// 3taps item.status
			timestamp : 12345							// 3taps item.timestamp
		}
	},
	annotations : {},									// 3taps item.annotations
	askingPrice : {
		currency : 'USD',								// 3taps item.currency
		value : ''											// 3taps item.price
	},
	expires : '2014-12-10T06:29:00Z'	// 3taps item.expires,
	geo : {
		accuracy : 0,										// 3taps item.location.accuracy
		coordinates: [0, 0],						// 3taps [item.location.lat, item.location.long]
		status : 0											// 3taps item.location.geolocation_status
	},
	body : 'required',								// 3taps item.body
	heading : 'required',							// 3taps item.heading
	images : {},											// 3taps item.images
	language : 'EN',									// 3taps item.language
	postingId : 'required'						// hashtagsell assigned ID
}
*/

var
	crypto = require('crypto'),

	async = require('async'),
	countdown = require('countdown'),

	errors = require('./errors'),
	validation = require('./validation'),

	DEFAULT_ID_LENGTH = 32;


module.exports = function (app, data, self) {
	'use strict';

	self = self || {};

	self.create = function (data, callback) {
		var
			modelError,
			postingId;

		// validate the input
		if (validation.isEmpty(data)) {
			modelError =
				new errors.RequiredFieldMissingError('posting payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(data.body)) {
			modelError =
				new errors.RequiredFieldMissingError('posting body is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(data.expires)) {
			modelError =
				new errors.RequiredFieldMissingError('posting expires Date is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(data.heading)) {
			modelError =
				new errors.RequiredFieldMissingError('posting heading is required');

			return setImmediate(callback, modelError);
		}

		// create an ID for the posting
		postingId = crypto.randomBytes(DEFAULT_ID_LENGTH).toString('base64');

		// TODO: define heuristics to look / search for duplicates

		// ensure data.expires is set to a Date
		if (/[0-9]*/.test(data.expires)) {
			// check for seconds
			if (data.expires.toString().length === 10) {
				data.expires = new Date(data.expires * 1000);
			} else {
				data.expires = new Date(data.expires);
			}
		}

		// perform insert
		data.postings.upsert(postingId, data, function (err, posting) {
			if (err) {
				modelError = new errors.PersistenceError('unable to store posting');
				modelError.originalError = err;

				return callback(modelError);
			}

			// return
			return callback(null, posting);
		});
	};

	self.find = function (options, callback) {

	};

	self.findById = function (postingId, callback) {

	};

	return self;
};
