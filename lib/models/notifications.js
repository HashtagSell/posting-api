var
	async = require('async'),
	countdown = require('countdown'),

	errors = require('./errors'),
	validation = require('./validation'),

	DEFAULT_EXPANSION_COUNT = 100;


module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	self.find = function (username, expansions, callback) {
		var
			modelError,
		 	options = {
				offers : {},
				questions : {}
			},
			result = {},
			startTime = new Date();

		if (validation.isEmpty(expansions.count)) {
			expansions.count = DEFAULT_EXPANSION_COUNT;
		} else {
			expansions.count =
				parseInt(expansions.count, 10) ||
				DEFAULT_EXPANSION_COUNT;
		}

		if (validation.isEmpty(expansions.offers)) {
			expansions.offers = true;
		} else {
			expansions.offers = expansions.offers.toLowerCase() !== 'false';
		}

		if (validation.isEmpty(expansions.questions)) {
			expansions.questions = true;
		} else {
			expansions.questions = expansions.questions.toLowerCase() !== 'false';
		}

		if (validation.isEmpty(expansions.start)) {
			expansions.start = 0;
		} else {
			expansions.start =
				parseInt(expansions.start, 10) ||
				0;
		}

		async.parallel([
			// answers to questions user has posed
			function (done) {
				if (!expansions.questions) {
					app.log.trace('skipping retrieval of questions');

					return setImmediate(done);
				}

				// flesh out query options for questions
				options.questions = {
					count : expansions.count,
					excludeEmptyAnswers : true,
					start : expansions.start
				};

				// apply the from date to show only notifications newer than X time
				if (!validation.isEmpty(expansions.from)) {
					options.questions.from = expansions.from;
				}

				data.questions.findByUsername(
					username,
					options.questions,
					function (err, questions) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to retrieve question/answer notifications');

							modelError.options = options.questions;
							modelError.username = username;

							return done(modelError);
						}

						app.log.trace('find question/answer notifications completed in %s',
							countdown(
								startTime,
								new Date(),
								countdown.MILLISECONDS).toString());

						result.questions = questions;

						return done();
					});
			},

			// offers made on all postings user has made
			function (done) {
				if (!expansions.postings) {
					return setImmediate(done);
				}

				// TODO: disabled for now because param is not passed
				// flesh out this section

				/*
				// flesh out options for postings
				options.postings = {
					count : expansions.count,
					excludeEmptyQuestions : true,
					start : expansions.start
				};

				// apply the from date to show only notifications newer than X time
				if (!validation.isEmpty(expansions.from)) {
					options.postings.from = expansions.from;
				}

				data.postings.findByUsername(
					username,
					options.postings,
					function (err, postings) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to retrieve posting/question notifications');

							modelError.options = options.postings;
							modelError.username = username;

							return done(modelError);
						}

						app.log.trace('find posting/question notifications completed in %s',
							countdown(
								startTime,
								new Date(),
								countdown.MILLISECONDS).toString());

						result.postings = postings;

						return done();
					});
				//*/
			},

			// offers that a user has made that have been accepted
			function (done) {
				if (!expansions.offers) {
					return setImmediate(done);
				}

				// flesh out options for postings
				options.offers = {
					count : expansions.count,
					excludeNotAccepted : true,
					start : expansions.start
				};

				// apply the from date to show only notifications newer than X time
				if (!validation.isEmpty(expansions.from)) {
					options.offers.from = expansions.from;
				}

				data.offers.findByUsername(
					username,
					options.offers,
					function (err, offers) {
						if (err) {
							modelError = new errors.PersistenceError(
								err,
								'unable to retrieve offers/accepted notifications');

							modelError.options = options.offers;
							modelError.username = username;

							return done(modelError);
						}

						app.log.trace('find offers/accepted notifications completed in %s',
							countdown(
								startTime,
								new Date(),
								countdown.MILLISECONDS).toString());

						result.offers = offers;

						return done();
					});
			}
		], function (err) {
			if (err) {
				return callback(err);
			}

			return callback(null, result);
		});

	};

	return self;
};
