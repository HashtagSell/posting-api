/* global db */
/* jshint strict : false */

/**
* Creates versions collection and fixes an index
**/

var
	cursor,
	version = 'v0.1.1';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {
	// remove unique constraint on 3taps id
	db.postings.dropIndex({ 'external.threeTaps.id' : 1 });

	// re-add constraint correctly (not unique)
	db.postings.ensureIndex({ 'external.threeTaps.id' : 1 });

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
