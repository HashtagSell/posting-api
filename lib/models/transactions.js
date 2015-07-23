/*
// Example transaction model

{
  "transactionId" : "abc123",
  "buyer" : {
    // open schema - any details submitted by client about buyer
  },
  "buyerUsername" : "joshua@hashtagsell.com",
  "createdAt" : "2015-05-08T09:24.000Z", // system managed
  "modifiedAt" : "2015-05-08T09:24.000Z", // system managed
  "offer" : {
    // open schema
  },
  "offerId" : "123abc",
  "paymentConfirmation" : {
    // open schema
  },
  "posting" : {
    // open schema
  },
  "postingId" : "987zxy",
  "seller" : {
    // open schema
  },
  "sellerUsername" : "brad@hashtagsell.com",
  "status" : "pending | completed | expired"
}
*/

var
	async = require('async'),
	countdown = require('countdown'),
	uuid = require('node-uuid'),

	errors = require('./errors'),
	validation = require('./validation'),

	TRANSACTION_STATUS = {
		COMPLETED : 'completed',
		EXPIRED : 'expired',
		PENDING : 'pending'
	};

module.exports = function (app, data, services, self) {
	'use strict';

	self = self || {};

	function isValidTransactionStatus (transaction) {
		var foundMatch =
			validation.isEmpty(transaction) ||
			validation.isEmpty(transaction.status);

		if (!foundMatch) {
			Object.keys(TRANSACTION_STATUS).some(function (key) {
				foundMatch = TRANSACTION_STATUS[key] === transaction.status;
				return foundMatch;
			});
		}

		return foundMatch;
	}

	/**
	 * Used by the route to create a transaction in the API
	 **/
	self.create = function (transaction, callback) {
		var
			modelError,
			transactionId,
			startTime = new Date();

		// validate the input
		if (validation.isEmpty(transaction)) {
			modelError =
				new errors.RequiredFieldMissingError('transaction payload is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(transaction.buyer)) {
			modelError =
				new errors.RequiredFieldMissingError('buyer is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(transaction.buyerUsername)) {
			modelError =
				new errors.RequiredFieldMissingError('buyerUsername is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(transaction.offerId)) {
			modelError =
				new errors.RequiredFieldMissingError('offerId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(transaction.postingId)) {
			modelError =
				new errors.RequiredFieldMissingError('postingId is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(transaction.seller)) {
			modelError =
				new errors.RequiredFieldMissingError('seller is required');

			return setImmediate(callback, modelError);
		}

		if (validation.isEmpty(transaction.sellerUsername)) {
			modelError =
				new errors.RequiredFieldMissingError('sellerUsername is required');

			return setImmediate(callback, modelError);
		}

		// set status
		if (validation.isEmpty(transaction.paymentConfirmation)) {
			transaction.status = TRANSACTION_STATUS.PENDING;
		} else {
			transaction.status = TRANSACTION_STATUS.CLOSED;
		}

		if (!isValidTransactionStatus(transaction)) {
			modelError =
				new errors.GeneralConflictError(
					'supplied transaction status is invalid');

			return setImmediate(callback, modelError);
		}

		async.waterfall([

				// lookup the posting...
				function (done) {
					data.postings.findByPostingId(
						transaction.postingId,
						function (err, posting) {
							if (!posting) {
								modelError = new errors.ResourceNotFoundError(
									'no posting exists with specified postingId');
									modelError.transaction = transaction;

								return done(modelError);
							}

							// assign posting to the transaction for record keeping
							transaction.posting = posting;

							return done();
						});
				},

				// look up the offer...
				function (done) {
					data.offers.findByOfferId(
						transaction.offerId,
						function (err, offer) {
							if (!offer) {
								modelError = new errors.ResourceNotFoundError(
									'no offer exists with specified offerId');
									modelError.transaction = transaction;

								return done(modelError);
							}

							// assign offer to the transaction for record keeping
							transaction.offer = offer;

							return done();
						});
				},

				// create the transaction
				function (done) {
					// create an ID for the transaction
					transactionId = uuid.v4().replace(/-/g, '');

					app.log.trace('creating transaction %s with status of %s',
						transactionId,
						transaction.status);

					// perform insert
					data.transactions.upsert(
						transactionId,
						transaction,
						function (err, newTransaction) {
							if (err) {
								modelError = new errors.PersistenceError(
									err,
									'unable to store transaction');
								modelError.transaction = transaction;

								return done(modelError);
							}

							app.log.trace('create transaction %s completed in %s',
								transactionId,
								countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

							// return
							return done(null, newTransaction);
						});
				},

				// remove posting from search
				function (newTransaction, done) {
					app.log.trace(
						'removing posting %s from search',
						newTransaction.postingId);

					data.postings.remove(
						newTransaction.postingId,
						false, // only remove from search index
						function (err) {
							if (err) {
								// not an error worth sending an error response for
								app.log.warn(
									'unable to remove posting %s from search',
									newTransaction.postingId);
							}

							return done(null, newTransaction);
						});
				}
			], callback);
	};

	/**
	 * Allows for removal of transactions
	 **/
	self.delete = function (transactionId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(transactionId)) {
			modelError =
				new errors.RequiredFieldMissingError('transactionId is required');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, transactionId),
				function (foundTransaction, done) {
					// make sure that removal is valid
					if (foundTransaction.status === TRANSACTION_STATUS.COMPLETED) {
						modelError = new errors.GeneralConflictError(
							'unable to remove transaction with status "completed"');
						modelError.transactionId = transactionId;

						return setImmediate(done, modelError);
					}

					return data.transactions.remove(foundTransaction.transactionId, done);
				}
			], function (err, removedTransaction) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to remove transaction by id');
					modelError.transactionId = transactionId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('delete transaction %s completed in %s',
					transactionId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, removedTransaction);
			});
	};

	/**
	 * Find transactions with filters
	 **/
	self.find = function (options, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(options)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'start and count query parameters required');

			return setImmediate(callback, modelError);
		}

		data.transactions.find(options, function (err, transactions) {
			if (err) {
				modelError = new errors.PersistenceError(
					err,
					'unable to find transactions');
				modelError.options = options;

				return callback(modelError);
			}

			app.log.trace('find transactions completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			// return
			return callback(null, transactions);
		});
	};

	/**
	 * Find a specific transaction
	 **/
	self.findById = function (transactionId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(transactionId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'transactionId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.transactions.findByTransactionId(
			transactionId,
			function (err, transaction) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find transaction by id');
					modelError.transactionId = transactionId;

					return callback(modelError);
				}

				if (!transaction) {
					modelError = new errors.ResourceNotFoundError(
						'no transaction exists with specified IDs');
					modelError.transactionId = transactionId;

					return callback(modelError);
				}

				app.log.trace('find transaction by ID completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, transaction);
			});
	};

	/**
	* Find a specific transaction by postingId
	**/
	self.findByPostingId = function (postingId, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(postingId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'postingId parameter is required');

			return setImmediate(callback, modelError);
		}

		data.transactions.findByPostingId(
			postingId,
			function (err, transaction) {
				if (err) {
					modelError = new errors.PersistenceError(
						err,
						'unable to find transaction by postingId');
					modelError.postingId = postingId;

					return callback(modelError);
				}

				if (!transaction) {
					modelError = new errors.ResourceNotFoundError(
						'no transaction exists with specified postingId');
					modelError.postingId = postingId;

					return callback(modelError);
				}

				app.log.trace('find transaction by postingId completed in %s',
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				// return
				return callback(null, transaction);
			});
	};

	/**
	 * Allows for the update of a transaction, method functions much more like
	 * a PATCH than a PUT in the sense that only the fields supplied are
	 * updated and the fields omitted are defauled with previous values.
	 **/
	self.update = function (transactionId, transaction, callback) {
		var
			modelError,
			startTime = new Date();

		if (validation.isEmpty(transactionId)) {
			modelError =
				new errors.RequiredFieldMissingError(
					'transactionId parameter is required');

			return setImmediate(callback, modelError);
		}

		// default transaction if is not supplied
		// results in modifiedAt being updated, ultimately
		transaction = transaction || {};

		// update transaction status if necessary
		if (transaction.paymentConfirmation &&
			(!transaction.status ||
				transaction.status === TRANSACTION_STATUS.PENDING)) {
			app.log.trace('setting status of transaction %s to %s',
				transactionId,
				TRANSACTION_STATUS.CLOSED);

			transaction.status = TRANSACTION_STATUS.CLOSED;
		}

		if (!isValidTransactionStatus(transaction)) {
			modelError =
				new errors.GeneralConflictError(
					'supplied transaction status is invalid');

			return setImmediate(callback, modelError);
		}

		async.waterfall([
				async.apply(self.findById, transactionId),
				function (foundTransaction, done) {
					return data.transactions.upsert(
						foundTransaction.transactionId,
						transaction,
						done);
				},
				function (updatedTransaction, done) {
					if (updatedTransaction.status !== TRANSACTION_STATUS.CLOSED) {
						return setImmediate(function () {
							return done(null, updatedTransaction);
						});
					}

					// remove posting - we have a record of it in the transaction
					return data.postings.remove(updatedTransaction.postingId, function (err) {
						return done(err, updatedTransaction);
					});
				}
			], function (err, updatedTransaction) {
				if (err && !err.statusCode) {
					modelError = new errors.PersistenceError(
						err,
						'unable to update transaction by id');
					modelError.transactionId = transactionId;

					return callback(modelError);
				}

				if (err) {
					return callback(err);
				}

				app.log.trace('update transaction %s completed in %s',
					transactionId,
					countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

				return callback(null, updatedTransaction);
			});
	};

	return self;
};
