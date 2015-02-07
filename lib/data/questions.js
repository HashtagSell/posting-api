var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	questionsSchema = mongoose.Schema({
		answers : [{
			answer : {
				required : true,
				type : String
			},
			answerId : {
				required : true,
				type : String
			},
			createdAt : {
				default : new Date(),
				required : true,
				type : Date
			}
		}],

		question : {
			required : true,
			type : String
		},

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
			userId : {
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

		/* Hashtagsell user */
		user : {
			index : true,
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

				return callback(null, question.toObject());
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

				return callback(null, JSON.parse(JSON.stringify(questions)));
			});
	};

	self.findByUser = function (user, options, callback) {
		var verr;

		Question
			.find({ deleted : false, user : user })
			.lean() // ensures Mongoose methods are stripped off
			.filter(options)
			.order(options)
			.page(options, function (err, questions) {
				if (err) {
					verr = new VError(
						err,
						'unable to find questions for user %s',
						user);

					verr.options = options;

					return callback(verr);
				}

				return callback(null, JSON.parse(JSON.stringify(questions)));
			});
	};

	self.upsert = function (questionId, question, callback) {
		if (typeof callback === 'undefined' && typeof question === 'function') {
			callback = question;
			question = questionId;
			questionId = question.questionId;
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

					// create new posting with postingId
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
					return callback(null, upsertQuestion.toObject());
				});
			});
	};

	return self;
};
