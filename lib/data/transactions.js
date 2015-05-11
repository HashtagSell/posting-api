var
	mongoose = require('mongoose'),
	VError = require('verror'),

	extensions = require('./extensions'),

	transactionsSchema = mongoose.Schema({});


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	// extend schemas with toObject override
	extensions.toObject(transactionsSchema);

	// create mongoose model
	var Transaction = mongoose.model('transactions', transactionsSchema);

	self.find = function (options, callback) {
		var verr;

		Transaction
			.find()
			.lean()
			.filter(options)
			.order(options)
			.page(options, function (err, transactions) {
				if (err) {
					verr = new VError(err, 'unable to find transactions');

					return callback(verr);
				}

				// return
				return callback(
					null,
					extensions.transformPageResults(transactions));
			});
	};

	self.findByTransactionId = function (transactionId, callback) {
		var verr;

		Transaction
			.findOne({ transactionId : transactionId })
			.exec(function (err, transaction) {
				if (err) {
					verr = new VError(
						err,
						'findByTransactionId for transaction %s failed',
						transactionId);

					return callback(verr);
				}

				if (!transaction) {
					app.log.trace(
						'no transactions exist with transactionId %s',
						transactionId);

					return callback();
				}

				// return
				return callback(null, transaction.toObject({ transform : true }));
			});
	};

	self.upsert = function (transactionId, transaction, callback) {
		if (typeof callback === 'undefined' && typeof transaction === 'function') {
			callback = transaction;
			transaction = transactionId;
			transactionId = transaction.transactionId || null;
		}

		var verr;

		Transaction
			.findOne({ transactionId : transactionId })
			.exec(function (err, upsertTransaction) {
				if (err) {
					verr = new VError(
						err,
						'lookup of transaction %s failed',
						transactionId);
					return callback(verr);
				}

				if (!upsertTransaction) {
					app.log.trace(
						'create new transaction with transactionId %s',
						transactionId);

					upsertTransaction = new Transaction();
					upsertTransaction.transactionId = transactionId;
				} else {
					app.log.trace(
						'updating existing transaction with transactionId %s',
						transactionId);

					// ensure transactionId remains intact
					delete transaction.transactionId;
				}

				// update failes
				extensions.updateFields(upsertTransaction, transaction);

				// ensure modified is properly set
				upsertTransaction.modifiedAt = new Date();

				upsertTransaction.save(function (err) {
					if (err) {
						verr = new VError(
							err,
							'save of transaction %s failed',
							transactionId);
						return callback(verr);
					}

					// return
					return callback(
						null,
						upsertTransaction.toObject({ transform : true }));
				});
			});
	};

	return self;
};
