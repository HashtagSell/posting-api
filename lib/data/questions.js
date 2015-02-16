var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	questionsSchema = mongoose.Schema({
		answers : [{
			answerId : {
				required : true,
				type : String
			},
			createdAt : {
				default : new Date(),
				required : true,
				type : Date
			},
			username : {
				required : true,
				type : String
			},
			value : {
				required : true,
				type : String
			}
		}],

		/* Hashtagsell question ID */
		questionId : {
			index : {
				unique : true
			},
			required : true,
			type : String
		},

		plus : [{
			createdAt : {
				default : new Date(),
				required : true,
				type : Date
			},
			username : {
				required : true,
				type : String
			}
		}],

		/* Hashtagsell posting ID */
		postingId : {
			index : true,
			required : true,
			type : String
		},

		/* Hashtagsell username */
		username : {
			index : true,
			required : true,
			type : String
		},

		value : {
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

	// extend schema
	extensions.auditFields(questionsSchema);
	extensions.toObject(questionsSchema);

	// create mongoose model
	var Question = mongoose.model('questions', questionsSchema);

	self.findByQuestionId = function (questionId, includeDeleted, callback) {
		if (typeof callback === 'undefined') {
			callback = includeDeleted;
			includeDeleted = false;
		}

		var
			query = {
				questionId : questionId
			},
			verr;

		if (!includeDeleted) {
			query.deleted = false;
		}

		Question
			.findOne(query)
			.exec(function (err, question) {
				if (err) {
					verr = new VError(
						err,
						'findByQuestionId for question %s failed',
						questionId);

					return callback(verr);
				}

				if (!question) {
					app.log.trace(
						'no questions with questionId %s exist',
						questionId);

					return callback();
				}

				return callback(null, question.toObject({ transform : true }));
			});
	};

	self.findByPostingId = function (postingId, options, callback) {
		var verr;

		Question
			.find({ deleted : false, postingId : postingId })
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, questions) {
				if (err) {
					verr = new VError(
						err,
						'unable to find questions for postingId %s',
						postingId);

					verr.options = options;

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(questions));
			});
	};

	self.findByUsername = function (postingId, username, options, callback) {
		if (typeof callback === 'undefined' && typeof options === 'function') {
			callback = options;
			options = username;
			username = postingId;
			postingId = null;
		}

		var
			query = { deleted : false, username : username },
			verr;

		// apply postingId to query when supplied
		if (postingId) {
			query.postingId = postingId;
		}

		Question
			.find(query)
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, questions) {
				if (err) {
					verr = new VError(
						err,
						'unable to find questions for username %s',
						username);

					verr.options = options;

					return callback(verr);
				}

				return callback(null, extensions.transformPageResults(questions));
			});
	};

	self.remove = function (questionId, callback) {
		var verr;

		Question
			.findOne({ deleted : false, questionId : questionId })
			.exec(function (err, question) {
				if (err) {
					verr = new VError(err, 'lookup of question %s failed', questionId);
					return callback(verr);
				}

				question.remove(function (err) {
					if (err) {
						verr =
							new VError(err, 'removal of question %s has failed', questionId);
						return callback(verr);
					}

					return callback(null, question.toObject({ transform : true }));
				});
			});
	};

	self.upsert = function (questionId, question, callback) {
		if (typeof callback === 'undefined' && typeof question === 'function') {
			callback = question;
			question = questionId;
			questionId = question.questionId || null;
		}

		var verr;

		// attempt to look up a posting with specified ID
		Question
			.findOne({ questionId : questionId })
			.exec(function (err, upsertQuestion) {
				if (err) {
					verr = new VError(err, 'lookup of question %s failed', questionId);
					return callback(verr);
				}

				// check for insert
				if (!upsertQuestion) {
					app.log.trace('creating new question with questionId %s', questionId);

					// create new question with questionId
					upsertQuestion = new Question();
					upsertQuestion.questionId = questionId;
				} else {
					app.log.trace(
						'updating existing question with questionId %s',
						questionId);

					// ensure questionId remains intact
					delete question.questionId;

					// re-enable the question
					if (upsertQuestion.deleted && typeof question.deleted === 'undefined') {
						app.log.trace(
							're-enabling existing question with questionId %s',
							questionId);

						upsertQuestion.deleted = false;
					}
				}

				// update fields
				extensions.updateFields(upsertQuestion, question);

				// ensure modified is properly set
				upsertQuestion.modifiedAt = new Date();

				// save it off...
				upsertQuestion.save(function (err) {
					if (err) {
						verr = new VError(err, 'save of question %s failed', questionId);
						return callback(verr);
					}

					// return to caller
					return callback(null, upsertQuestion.toObject({ transform : true }));
				});
			});
	};

	return self;
};
