'use strict';

var
	del = require('del'),
	gulp = require('gulp'),
	istanbul = require('gulp-istanbul'),
	jshint = require('gulp-jshint'),
	mocha = require('gulp-mocha'),
	request = require('request'),
	sequence = require('run-sequence'),
	spawn = require('child_process').spawn,

	/* IMPORTANT NOTE: This matches a setting in ./init/elasticsearch.yml */
	ES_DB_DIRECTORY = '/usr/local/var/elasticsearch/hashtagsell',

	/* IMPORTANT NOTE: This matches a setting in ./init/mongodb.conf */
	MONGO_DB_DIRECTORY = '/usr/local/var/mongodb/hashtagsell';


function ensureDirectory (path, callback) {
	// Note: using child_process.spawn instead of fs.mkdir so I can
	// leverage the -p parameter
	var
		err,
		message = '',
		mkdir = spawn('mkdir', ['-p', path]);

	mkdir.stdout.on('data', function (data) {
		message += data;
	});

	mkdir.stderr.on('data', function (data) {
		message += data;
	});

	mkdir.on('close', function (code) {
		if (code !== 0) {
			err = new Error(
				'Error occurred attempting to create directory at ' +
				path);
			err.exitCode = code;
			err.message = message;

			return callback(err);
		}

		return callback(null, message);
	});
}


gulp.task('clean', function (callback) {
	return del(['coverage'], callback);
});


gulp.task('jshint', function () {
	return gulp
		.src(['lib/**/*.js', 'test/**/*.js'])
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('ensure-data-directory', function (callback) {
	ensureDirectory(MONGO_DB_DIRECTORY, callback);
});


gulp.task('ensure-es-directory', function (callback) {
	ensureDirectory(ES_DB_DIRECTORY, callback);
});


gulp.task('es-start', ['ensure-es-directory'], function (callback) {
	var
		err,
		message = '',
		mongod = spawn('elasticsearch', ['--config=./init/elasticsearch.yml', '-d']);

	mongod.stdout.on('data', function (data) {
		message += data;
	});

	mongod.stderr.on('data', function (data) {
		message += data;
	});

	mongod.on('close', function (code) {
		if (code === 100) {
			console.log('An instance of Mongo may already be running...');
			console.log(message);

			return callback(null, message);
		}

		if (code !== 0) {
			err = new Error('Error occurred attempting to start Mongo');
			err.exitCode = code;
			err.message = message;

			return callback(err);
		}

		return callback(null, message);
	});
});


gulp.task('es-stop', function (callback) {
	request({
		method: 'POST',
		url : 'http://localhost:9200/_shutdown'
	}, function (err, res, body) {
		if (res && res.statusCode > 299) {
			return callback(new Error(body));
		}

		return callback(err);
	});
});


gulp.task('mongo-start', ['ensure-data-directory'], function (callback) {
	var
		err,
		message = '',
		mongod = spawn('mongod', ['--config', './init/mongodb.conf']);

	mongod.stdout.on('data', function (data) {
		message += data;
	});

	mongod.stderr.on('data', function (data) {
		message += data;
	});

	mongod.on('close', function (code) {
		if (code === 100) {
			console.log('An instance of Mongo may already be running...');
			console.log(message);

			return callback(null, message);
		}

		if (code !== 0) {
			err = new Error('Error occurred attempting to start Mongo');
			err.exitCode = code;
			err.message = message;

			return callback(err);
		}

		return callback(null, message);
	});
});


gulp.task('mongo-stop', function (callback) {
	var
		err = '',
		message = '',
		mongo = spawn('mongo', [
			'--eval',
			'db.getSiblingDB("admin").shutdownServer()']);

	mongo.stdout.on('data', function (data) {
		message += data;
	});

	mongo.stderr.on('data', function (data) {
		message += data;
	});

	mongo.on('close', function (code) {
		if (code !== 0) {
			err = new Error('Error occurred attempting to stop Mongo');
			err.exitCode = code;
			err.message = message;

			return callback(err);
		}

		return callback(null, message);
	});
});


gulp.task('test-all', function (callback) {
	sequence('clean', 'jshint', 'test-coverage', callback);
});


gulp.task('test-coverage', ['clean'], function () {
	return gulp
		.src(['./lib/**/*.js'])
		.pipe(istanbul())
		.pipe(istanbul.hookRequire())
		.on('finish', function () {
			gulp
				.src(['./test/lib/**/*.js'])
				.pipe(mocha({
					reporter : 'spec'
				}))
				.pipe(istanbul.writeReports('./reports'));
		});
});


gulp.task('test-functional', function () {
	return gulp
		.src(['./test/functional/**/*.js'], { read : false })
		.pipe(mocha({
			checkLeaks : true,
			reporter : 'spec',
			ui : 'bdd'
		}));
});


gulp.task('test-unit', function () {
	return gulp
	.src(['./test/lib/**/*.js'], { read : false })
	.pipe(mocha({
		checkLeaks : true,
		reporter : 'spec',
		ui : 'bdd'
	}));
});
