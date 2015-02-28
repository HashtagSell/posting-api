var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/postings');
	app.use('/v1/postings', router);

	router.delete('/:postingId', function (req, res, next) {
		models.postings.delete(req.params.postingId, function (err, posting) {
			if (err) {
				return next(err);
			}

			return res.status(204).json(posting);
		});
	});

	router.get('/', function (req, res, next) {
		models.postings.find(req.queryOptions, function (err, postings) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(postings);
		});
	});

	router.get('/:postingId', function (req, res, next) {
		models.postings.findById(
			req.params.postingId,
			{
				count : req.query.count,
				offers : req.query.offers || false,
				questions : req.query.questions || false
			},
			function (err, posting) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(posting);
			});
	});

	/**
	 * Creates a new posting with body data
	 **/
	router.post('/', function (req, res, next) {
		models.postings.create(req.body, function (err, posting) {
			if (err) {
				return next(err);
			}

			return res.status(201).json(posting);
		});
	});

	router.put('/:postingId', function (req, res, next) {
		models.postings.update(
			req.params.postingId,
			req.body,
			function (err, posting) {
				if (err) {
					return next(err);
				}

				return res.status(202).json(posting);
			});
	});

	app.log.trace('registering routes for /v1/postings/:postingId/offers');

	router.delete('/:postingId/offers/:offerId', function (req, res, next) {
		models.offers.delete(
			req.params.postingId,
			req.params.offerId,
			function (err, offer) {
				if (err) {
					return next(err);
				}

				return res.status(204).json(offer);
			});
	});

	router.get('/:postingId/offers', function (req, res, next) {
		models.offers.findByPostingId(
			req.params.postingId,
			req.queryOptions,
			function (err, offers) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(offers);
			});
	});

	router.get('/:postingId/offers/:offerId', function (req, res, next) {
		models.offers.findById(
			req.params.postingId,
			req.params.offerId,
			function (err, offer) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(offer);
			});
	});

	router.post('/:postingId/offers', function (req, res, next) {
		models.offers.create(req.params.postingId, req.body, function (err, offer) {
			if (err) {
				return next(err);
			}

			return res.status(201).json(offer);
		});
	});

	/**
	 * WARNING: NON-STANDARD RESOURCE!!!
	 *
	 * Exists to make client code more simple for the case of confirming a
	 * proposed time to meet.
	 *
	 * Also need to figure out how (and whether if necessary) to supply
	 * username of person who accepts the offer - security could be left to
	 * the client for now which may be reasonable to start.
	 **/
	router.delete('/:postingId/offers/:offerId/accept', function (req, res, next) {
		models.offers.unacceptOffer(
			req.params.postingId,
			req.params.offerId,
			function (err, offer) {
				if (err) {
					return next(err);
				}

				return res.status(204).json(offer);
			});
	});

	router.post('/:postingId/offers/:offerId/accept', function (req, res, next) {
		models.offers.acceptOffer(
			req.params.postingId,
			req.params.offerId,
			req.body,
			function (err, offer) {
				if (err) {
					return next(err);
				}

				return res.status(201).json(offer);
			});
	});

	router.put('/:postingId/offers/:offerId', function (req, res, next) {
		models.offers.update(
			req.params.postingId,
			req.params.offerId,
			req.body,
			function (err, offer) {
				if (err) {
					return next(err);
				}

				return res.status(202).json(offer);
			});
	});

	app.log.trace('registering routes for /v1/postings/:postingId/questions');

	router.delete('/:postingId/questions/:questionId', function (req, res, next) {
		models.questions.delete(req.params.questionId, function (err, question) {
			if (err) {
				return next(err);
			}

			return res.status(204).json(question);
		});
	});

	router.get('/:postingId/questions', function (req, res, next) {
		models.questions.findByPostingId(
			req.params.postingId,
			req.queryOptions,
			function (err, questions) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(questions);
			});
	});

	router.get('/:postingId/questions/:questionId', function (req, res, next) {
		models.questions.findById(req.params.questionId, function (err, question) {
			if (err) {
				return next(err);
			}

			return res.status(200).json(question);
		});
	});

	router.post('/:postingId/questions', function (req, res, next) {
		models.questions.create(
			req.params.postingId,
			req.body,
			function (err, question) {
				if (err) {
					return next(err);
				}

				return res.status(201).json(question);
			});
	});

	router.put('/:postingId/questions/:questionId', function (req, res, next) {
		models.questions.update(
			req.params.questionId,
			req.body,
			function (err, question) {
				if (err) {
					return next(err);
				}

				return res.status(202).json(question);
			});
	});

	app.log.trace(
		'registering routes for /v1/postings/:postingId/questions/:questionId/answers');

	router.delete(
		'/:postingId/questions/:questionId/answers/:answerId',
		function (req, res, next) {
			models.questions.deleteAnswer(
				req.params.questionId,
				req.params.answerId,
				function (err, answer) {
					if (err) {
						return next(err);
					}

					return res.status(204).json(answer);
				});
		});

	router.post(
		'/:postingId/questions/:questionId/answers',
		function (req, res, next) {
			models.questions.createAnswer(
				req.params.questionId,
				req.body,
				function (err, answer) {
					if (err) {
						return next(err);
					}

					return res.status(201).json(answer);
				});
		});

	return self;
};
