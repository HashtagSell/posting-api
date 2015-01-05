/* jshint camelcase : false */
var
	chai = require('chai'),

	defaultConfig = require('../../../lib/config/default.json'),
	postingsModel = require('../../../lib/models/postings'),
	should = chai.should();


describe('postings', function () {
	'use strict';

	function mockDataFunction (method) {
		return function () {
			var
				callback,
				response = {
					args : [],
					method : method
				};

			// collect all arguments passed
			for (var arg in arguments) {
				if (arguments.hasOwnProperty(arg)) {
					if (typeof arguments[arg] === 'function') {
						callback = arguments[arg];
					} else {
						response.args.push(arguments[arg]);
					}
				}
			}

			// override to test no result returned from findById
			if (method === 'findById' && response.args[0] < 0) {
				response = null;
			}

			if (callback) {
				return setImmediate(function () {
					return callback(null, response);
				});
			}

			return response;
		};
	}

	/**
	 * Mocking app and data to inject into models for testing
	 **/
	var
	 	mockApp = {
			config : defaultConfig,
			log : {
				debug : function () {},
				error : function () {},
				info : function () {},
				trace : function () {},
				warn : function () {}
			}
		},
		mock3tapsPosting = {},
		mockData = {
			postings : {
				find : mockDataFunction('find'),
				findById : mockDataFunction('findById'),
				upsert : mockDataFunction('upsert')
			}
		},
		postings;

	/**
	 * Reset the state of the mocks
	 **/
	beforeEach(function () {
		mock3tapsPosting = {
			source : 'test-src',
			external_id : 'test-id',
			external_url : 'https://test.test/test',
			id : 12345,
			category : 'AAA',
			category_group : 'AAAA',
			location : {
				accuracy : 1,
				city : 'test-city',
				country : 'test-country',
				county : 'test-county',
				formatted_address : '123 test ave, test, test 12345',
				geolocation_status : 1,
				lat : 1.1,
				locality : 'test-locality',
				long : 1.2,
				metro : 'test-metro',
				region : 'test-region',
				state : 'test-state',
				zipcode : 'test-zip'
			},
			status : 'test-status',
			timestamp : Math.floor(Number(new Date()) / 1000),
			annotations : {
				test : 'test'
			},
			currency : 'USD',
			price : '59.99',
			expires : Math.floor(Number(new Date()) / 1000) + (5 * 24 * 60 * 60),
			body : 'test posting body',
			heading : 'test for sale!',
			images : {},
			language : 'EN'
		};
		postings = postingsModel(mockApp, mockData);
	});

	describe('#create', function () {
		it('should not allow empty data', function (done) {
			postings.create({}, function (err, result) {
				should.exist(err);
				should.not.exist(result);
				err.statusCode.should.equal(409);

				return done();
			});
		});

		it('should not allow empty posting body', function (done) {
			delete mock3tapsPosting.body;
			postings.create(mock3tapsPosting, function (err, result) {
				should.exist(err);
				should.not.exist(result);
				err.name.should.equal('RequiredFieldMissingError');
				err.statusCode.should.equal(409);

				return done();
			});
		});

		it('should not allow empty heading', function (done) {
			delete mock3tapsPosting.heading;
			postings.create(mock3tapsPosting, function (err, result) {
				should.exist(err);
				should.not.exist(result);
				err.name.should.equal('RequiredFieldMissingError');
				err.statusCode.should.equal(409);

				return done();
			});
		});

		it('should properly call upsert', function (done) {
			postings.create(mock3tapsPosting, function (err, result) {
				should.not.exist(err);
				should.exist(result);
				result.method.should.equal('upsert');

				return done();
			});
		});

		it('should properly assign a posting ID', function (done) {
			postings.create(mock3tapsPosting, function (err, result) {
				should.not.exist(err);
				should.exist(result);
				result.args.should.have.length(2);
				result.args[0].should.not.be.empty();

				return done();
			});
		});

		it('should properly detect created and expires as seconds and convert to date', function (done) {
			postings.create(mock3tapsPosting, function (err, result) {
				should.not.exist(err);
				should.exist(result);
				result.args[1].created.should.be.a('Date');
				result.args[1].expires.should.be.a('Date');

				return done();
			});
		});

		it('should properly allow created and expires to be dates', function (done) {
			mock3tapsPosting.timestamp = new Date();
			mock3tapsPosting.expires = new Date();
			mock3tapsPosting.expires.setDate(mock3tapsPosting.expires.getDate() + 5);

			postings.create(mock3tapsPosting, function (err, result) {
				should.not.exist(err);
				should.exist(result);
				result.args[1].created.should.be.a('Date');
				result.args[1].expires.should.be.a('Date');

				return done();
			});
		});

		it('should properly default expires when missing', function (done) {
			delete mock3tapsPosting.timestamp;
			delete mock3tapsPosting.expires;

			postings.create(mock3tapsPosting, function (err, result) {
				should.not.exist(err);
				should.exist(result);
				result.args[1].created.should.be.a('Date');
				result.args[1].expires.should.be.a('Date');

				return done();
			});
		});

		it('should properly retain existing external data', function (done) {
			mock3tapsPosting.external = {
				source : {
					code : 'saved-code',
					id : 'saved-id',
					url : 'https://saved.url/test'
				},
				threeTaps : {
					id : 'saved-3taps-id'
				}
			};

			// remove 3taps fields to ensure no overwrite
			delete mock3tapsPosting.source;
			delete mock3tapsPosting.external_id;
			delete mock3tapsPosting.external_url;
			delete mock3tapsPosting.id;

			postings.create(mock3tapsPosting, function (err, result) {
				should.not.exist(err);
				should.exist(result);

				should.exist(result.args[1].external);
				should.exist(result.args[1].external.source);
				result.args[1].external.source.code.should.equal('saved-code');
				result.args[1].external.source.id.should.equal('saved-id');
				result.args[1].external.source.url.should.equal('https://saved.url/test');
				should.exist(result.args[1].external.threeTaps);
				result.args[1].external.threeTaps.id.should.equal('saved-3taps-id');

				return done();
			});
		});
	});

	describe('#find', function () {
		it('should not allow empty search options', function (done) {
			postings.find({}, function (err, result) {
				should.exist(err);
				should.not.exist(result);

				err.statusCode.should.equal(409);
				err.name.should.equal('RequiredFieldMissingError');

				return done();
			});
		});

		it('should properly search with options', function (done) {
			postings.find({ start : 0, count : 100 }, function (err, result) {
				should.not.exist(err);
				should.exist(result);

				result.args.should.have.length(1);
				result.method.should.equal('find');

				return done();
			});
		});
	});

	describe('#findById', function () {
		it('should not allow null postingId', function (done) {
			postings.findById(null, function (err, result) {
				should.exist(err);
				should.not.exist(result);

				err.statusCode.should.equal(409);
				err.name.should.equal('RequiredFieldMissingError');

				return done();
			});
		});

		it('should properly search with options', function (done) {
			postings.findById(1, function (err, result) {
				should.not.exist(err);
				should.exist(result);

				result.method.should.equal('findById');

				return done();
			});
		});

		it('should properly generate error when no result is found', function (done) {
			postings.findById(-1, function (err, result) {
				should.exist(err);
				should.not.exist(result);

				err.statusCode.should.equal(404);
				err.name.should.equal('ResourceNotFoundError');

				return done();
			});
		});
	});
});
