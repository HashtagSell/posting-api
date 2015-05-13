var express = require('express');


module.exports = function (app, models, self) {
	'use strict';

	self = self || {};

	var router = express.Router();

	app.log.trace('registering routes for /v1/transactions');
	app.use('/v1/transactions', router);

	router.get('/', function (req, res, next) {
		models.transactions.find(
			req.query,
			function (err, transactions) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(transactions);
			});
	});

	router.get('/:transactionId', function (req, res, next) {
		models.transactions.findById(
			req.params.transactionId,
			function (err, transaction) {
				if (err) {
					return next(err);
				}

				return res.status(200).json(transaction);
			});
	});

	/**
	 * Creates a new transaction with body data
	 **/
	router.post('/', function (req, res, next) {
		models.transactions.create(req.body, function (err, transaction) {
			if (err) {
				return next(err);
			}

			return res.status(201).json(transaction);
		});
	});

	/**
	 * Update a transaction
	 **/
	router.put('/:transactionId', function (req, res, next) {
		models.transactions.update(
			req.params.transactionId,
			req.body,
			function (err, transaction) {
				if (err) {
					return next(err);
				}

				return res.status(202).json(transaction);
			});
	});

	router.delete('/:transactionId', function (req, res, next) {
		models.transactions.delete(
			req.params.transactionId,
			function (err, transaction) {
				if (err) {
					return next(err);
				}

				return res.status(204).json(transaction);
			});
	});
};
