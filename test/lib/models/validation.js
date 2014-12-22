var
	chai = require('chai'),

	should = chai.should(),
	validationModel = require('../../../lib/models/validation');


describe('validation', function () {
	'use strict';

	describe('#isEmpty', function () {
		it('should properly verify blank strings are empty', function () {
			should.exist(validationModel.isEmpty);
			validationModel.isEmpty('').should.equal(true);
		});

		it('should properly verify null values are empty', function () {
			validationModel.isEmpty(null).should.equal(true);
		});

		it('should properly verify undefined values are empty', function () {
			var undef;

			validationModel.isEmpty(undef).should.equal(true);
		});

		it('should properly verify empty arrays', function () {
			validationModel.isEmpty([]).should.equal(true);
		});

		it('should properly verify blank objects are empty', function () {
			validationModel.isEmpty({}).should.equal(true);
		});

		it('should properly allow Date values through', function () {
			validationModel.isEmpty(new Date()).should.equal(false);
		});
	});
});
