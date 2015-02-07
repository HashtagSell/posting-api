/*
// Example question model

var question = {
	questionId : '',
	postingId : '',
	question : '',
	answers : [{
		answerId : '',
		answer : '',
		createdAt : '2015-02-07T14:53:22Z'
	}],
	plus : [{
		createdAt : ''2015-02-06T08:17:54Z,
		user : ''
	}],
	user : ''
};
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation');


module.exports = function (app, data, self) {
	'use strict';

	self = self || {};

	/**
	 * Used by the route to create a question in the API
	 **/
	self.create = function (question, callback) {
		var
			modelError,
			questionId,
			startTime = new Date();

		// validate the input
		if (validation.isEmpty(question)) {
			modelError =
				new errors.RequiredFieldMissingError('question payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(question.postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(question.question)) {
			modelError =
				new errors.RequiredFieldMissingError('question is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(question.user)) {
			modelError =
				new errors.RequiredFieldMissingError('user is required');

			return setImmediate(callback, modelError);
		}

		// create an ID for the question
		questionId = uuid.v4().replace(/-/g, '');

		app.log.trace('assigning ID %s to question', questionId);

		// perform insert
		data.questions.upsert(questionId, question, function (err, newQuestion) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to store question');

				return callback(modelError);
			}

			app.log.trace('create question %s completed in %s',
				questionId,
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, newQuestion);
		});
	};

	self.createAnswer = function (questionId, answer, callback) {
		var
			answerId,
			modelError,
			question,
			startTime = new Date();

		if (validation.isEmpty(answer)) {
			modelError =
				new errors.RequiredFieldMissingError('answer payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(answer.user)) {
			modelError =
				new errors.RequiredFieldMissingError('user is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(answer.value)) {
			modelError =
				new errors.RequiredFieldMissingError('value is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, questionId),
				function (foundQuestion, done) {
					question = foundQuestion;

					// create an ID for the answer
					answerId = uuid.v4().replace(/-/g, '');

					app.log.trace('assigning ID %s to answer', answerId);
					answer.answerId = answerId;

					// make sure answers array exists
					if (typeof question.answers === 'undefined') {
						question.answers = [];
					}

					question.answers.push(answer);

					return setImmediate(done);
				},
				async.apply(self.update, question.questionId, question)
			], function (err) {
				app.log.trace('create answer %s completed in %s',
					answerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to create answer');

					modelError.answer = answer;
					modelError.questionId = questionId;
				}

				return callback(modelError, answer);
			});
	};

	/**
	 * Allows for removal of questions
	 **/
	self.delete = function (questionId, callback) {
		var
			modelError,
			question,
			startTime = new Date();

		async.waterfall([
				async.apply(self.findById, questionId),
				function (foundQuestion, done) {
					question = foundQuestion;

					return data.questions.remove(foundQuestion.questionId, done);
				}
			], function (err) {
				app.log.trace('delete question %s completed in %s',
					questionId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove question by id');

					modelError.questionId = questionId;
				}

				return callback(modelError, question);
			});
	};

	self.deleteAnswer = function (questionId, answerId, callback) {
		var
			answer,
			modelError,
			question,
			startTime = new Date();

		async.waterfall([
				async.apply(self.findById, questionId),
				function (foundQuestion, done) {
					question = foundQuestion;

					question.answers.some(function (a, i) {
						if (a.answerId === answerId) {
							answer = a;
							question.answers.splice(i, 1);
						}

						return typeof answer !== 'undefined';
					});

					if (!answer) {
						modelError = new errors.ResourceNotFoundError(
							'no answer exists with specified ID');
						modelError.answerId = answerId;
						modelError.questionId = questionId;
					}

					return setImmediate(done, modelError);
				},
				async.apply(self.update, question.questionId, question)
			], function (err) {
				app.log.trace('delete answer %s completed in %s',
					answerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove answer by id');

					modelError.answerId = answerId;
					modelError.questionId = questionId;
				}

				return callback(modelError, answer);
			});
	};

	/**
	 * Find a specific question
	 **/
	self.findById = function (questionId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(questionId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'questionId parameter is required');
			modelError.questionId = questionId;

			return setImmediate(callback, modelError);
		}

		data.questions.findByQuestionId(questionId, function (err, question) {
			app.log.trace('find question by ID completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find question by id');
				modelError.questionId = questionId;
			}

			if (!question) {
				modelError = new errors.ResourceNotFoundError(
					'no question exists with specified ID');
				modelError.questionId = questionId;
			}

			// return
			return callback(modelError, question);
		});
	};

	/**
	 * Accepts query filter, sort and pagination parameters and uses
	 * data.questions.find to lookup all matching questions.
	 **/
	self.findByPostingId = function (postingId, options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'postingId parameter is required');
			modelError.options = options;

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');
			modelError.options = options;

			return setImmediate(callback, modelError);
		}

		data.questions.findByPostingId(postingId, options, function (err, questions) {
			app.log.trace('find questions completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find questions');
				modelError.options = options;
				modelError.postingId = postingId;

				return callback(modelError);
			}

			// return
			return callback(null, questions);
		});
	};

	/**
	 * Allows for the update of a question, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (questionId, question, callback) {
		var
			modelError,
			startTime = new Date();

		async.waterfall([
				async.apply(self.findById, questionId),
				function (foundQuestion, done) {
					return data.questions.upsert(
						foundQuestion.questionId,
						question,
						done);
				}
			], function (err, updatedQuestion) {
				app.log.trace('update question %s completed in %s',
					questionId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to update question by id');

					modelError.questionId = questionId;
				}

				return callback(modelError, updatedQuestion);
			});
	};

	return self;
};
