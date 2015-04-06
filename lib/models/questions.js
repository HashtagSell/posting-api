/*
// Example question model

var question = {
	questionId : '',
	postingId : '',
	answers : [{
		answerId : '',
		createdAt : '2015-02-07T14:53:22Z',
		username : '',
		value : ''
	}],
	plus : [{
		createdAt : ''2015-02-06T08:17:54Z,
		username : ''
	}],
	username : '',
	value : ''
};
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation'),

	SOCKET_CHANNEL = '/postings',
	SOCKET_EVENT_ANSWER = 'answer',
	SOCKET_EVENT_QUESTION = 'question';

module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	/**
	 * Used by the route to create a question in the API
	 **/
	self.create = function (postingId, question, callback) {
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

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(question.value)) {
			modelError =
				new errors.RequiredFieldMissingError('value is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(question.username)) {
			modelError =
				new errors.RequiredFieldMissingError('username is required');

			return setImmediate(callback, modelError);
		}

		// TODO: Validate existence of posting?

		async.waterfall([
				async.apply(
					data.questions.findByUsername,
					postingId,
					question.username,
					{}),
				function (foundQuestions, done) {
					var existingQuestion;

					if (foundQuestions.total > 0) {
						foundQuestions.results.some(function (q) {
							if (q.value === question.value) {
								existingQuestion = q;
							}

							return typeof existingQuestion !== 'undefined';
						});
					}

					return setImmediate(function () {
						return done(null, existingQuestion);
					});
				},

				// lookup the posting...
				function (existingQuestion, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for question',
								postingId);
						}

						return done(err, existingQuestion, posting);
					});
				},

				function (existingQuestion, posting, done) {
					if (existingQuestion) {
						app.log.trace(
							'found existing question with ID %s',
							existingQuestion.questionId);

						return setImmediate(function () {
							return done(null, existingQuestion);
						});
					}

					// create an ID for the question
					questionId = uuid.v4().replace(/-/g, '');

					// assign postingId
					question.postingId = postingId;

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

						// emit message on realtime-svc
						services.realtime.emit(
							SOCKET_CHANNEL,
							SOCKET_EVENT_QUESTION,
							{
								posting : posting,
								question : newQuestion,
								username : newQuestion.username,
								timestamp : new Date()
							});

						// return
						return callback(null, newQuestion);
					});
				}
			], callback);
	};

	self.createAnswer = function (postingId, questionId, answer, callback) {
		var
			answerId,
			modelError,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(questionId)) {
			modelError =
				new errors.RequiredFieldMissingError('questionId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(answer)) {
			modelError =
				new errors.RequiredFieldMissingError('answer payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(answer.username)) {
			modelError =
				new errors.RequiredFieldMissingError('username is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(answer.value)) {
			modelError =
				new errors.RequiredFieldMissingError('value is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, postingId, questionId),
				function (question, done) {
					app.log.trace(
						'creating answer for question %s',
						question.questionId);

					// create an ID for the answer
					answerId = uuid.v4().replace(/-/g, '');

					app.log.trace('assigning ID %s to answer', answerId);
					answer.answerId = answerId;

					// make sure answers array exists
					if (typeof question.answers === 'undefined') {
						question.answers = [];
					}

					question.answers.push(answer);

					return self.update(postingId, questionId, question, done);
				},

				// lookup the posting...
				function (updatedQuestion, done) {
					data.postings.findById(postingId, function (err, posting) {
						if (!posting) {
							app.log.warn(
								'unable to find the posting (%s) for answer',
								postingId);
						}

						return done(err, updatedQuestion, posting);
					});
				},
			], function (err, updatedQuestion, posting) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to create answer');

					modelError.answer = answer;
					modelError.postingId = postingId;
					modelError.questionId = questionId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('create answer %s completed in %s',
					answerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// emit message on realtime-svc
				services.realtime.emit(
					SOCKET_CHANNEL,
					SOCKET_EVENT_ANSWER,
					{
						answer : answer,
						posting : posting,
						questionId : questionId,
						username : answer.username,
						timestamp : new Date()
					});

				return callback(null, answer);
			});
	};

	/**
	 * Allows for removal of questions
	 **/
	self.delete = function (postingId, questionId, callback) {
		var
			modelError,
			question,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(questionId)) {
			modelError =
				new errors.RequiredFieldMissingError('questionId is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, postingId, questionId),
				function (foundQuestion, done) {
					question = foundQuestion;

					return data.questions.remove(foundQuestion.questionId, done);
				}
			], function (err) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove question by id');

					modelError.postingId = postingId;
					modelError.questionId = questionId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('delete question %s completed in %s',
					questionId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, question);
			});
	};

	self.deleteAnswer = function (postingId, questionId, answerId, callback) {
		var
			answer,
			modelError,
			question,
			startTime = new Date();

		if (validation.isEmpty(answerId)) {
			modelError =
				new errors.RequiredFieldMissingError('answerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(questionId)) {
			modelError =
				new errors.RequiredFieldMissingError('questionId is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, postingId, questionId),
				function (foundQuestion, done) {
					question = foundQuestion;

					question.answers.some(function (a, i) {
						if (a.answerId === answerId) {
							app.log.trace('removing answer from question');
							answer = a;
							question.answers.splice(i, 1);
						}

						return typeof answer !== 'undefined';
					});

					if (!answer) {
						modelError = new errors.ResourceNotFoundError(
							'no answer exists with specified ID');
						modelError.answerId = answerId;
						modelError.postingId = postingId;
						modelError.questionId = questionId;

						return setImmediate(done, modelError);
					}

					// update the question with removed answer
					return self.update(
						postingId,
						questionId,
						question,
						done);
				}
			], function (err) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove answer by id');

					modelError.answerId = answerId;
					modelError.postingId = postingId;
					modelError.questionId = questionId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('delete answer %s completed in %s',
					answerId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, answer);
			});
	};

	/**
	 * Find a specific question
	 **/
	self.findById = function (postingId, questionId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(questionId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'questionId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.questions.findByQuestionId(
			postingId,
			questionId,
			function (err, question) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find question by id');
					modelError.postingId = postingId;
					modelError.questionId = questionId;

					return callback(modelError);
				}

				if (!question) {
					modelError = new errors.ResourceNotFoundError(
						'no question exists with specified IDs');
					modelError.postingId = postingId;
					modelError.questionId = questionId;

					return callback(modelError);
				}

				app.log.trace('find question by ID completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, question);
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

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.questions.findByPostingId(postingId, options, function (err, questions) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find questions');
				modelError.options = options;
				modelError.postingId = postingId;

				return callback(modelError);
			}

			app.log.trace('find questions completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, questions);
		});
	};

	/**
	 * Find all questions created by a given user
	 **/
	self.findByUsername = function (username, options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(username)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'username parameter is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.questions.findByUsername(username, options, function (err, questions) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find questions');
				modelError.options = options;
				modelError.username = username;

				return callback(modelError);
			}

			app.log.trace('find questions completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, questions);
		});
	};

	/**
	 * Allows for the update of a question, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (postingId, questionId, question, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(questionId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'questionId parameter is required');

			return setImmediate(callback, modelError);
		}

		// default question if is not supplied
		// results in modifiedAt being updated, ultimately
		question = question || {};

		async.waterfall([
				async.apply(self.findById, postingId, questionId),
				function (foundQuestion, done) {
					return data.questions.upsert(
						foundQuestion.questionId,
						question,
						done);
				}
			], function (err, updatedQuestion) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to update question by id');

					modelError.postingId = postingId;
					modelError.questionId = questionId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('update question %s completed in %s',
					questionId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, updatedQuestion);
			});
	};

	return self;
};
