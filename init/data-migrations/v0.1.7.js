/* global db */
/* jshint strict : false */

/**
 * Removes all postings with MMMM or PPPP as categories
 **/

var
	cursor,
	version = 'v0.1.7';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {

	db.postings.remove({
		'external.threeTaps.categoryGroup' : 'MMMM'
	});

	db.postings.remove({
		'external.threeTaps.categoryGroup' : 'PPPP'
	});

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
