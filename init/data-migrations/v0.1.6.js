/* global db */
/* jshint strict : false */

/**
 * Fixes the ebay categories collection
 **/

var
	cursor,
	version = 'v0.1.6';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {

	db.ebayCategories.renameCollection('ebaycategories', true);

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
