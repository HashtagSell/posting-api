/**
 * Ensures categoryCode is supplied for each posting
 **/

var
	cursor,
	version = 'v0.1.3';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {
	// apply categoryCode
	db.postings.find().forEach(function (posting) {
		// uncategorized - other
		var categoryCode = 'ZOTH';

		if (posting.external && posting.external.threeTaps) {
			categoryCode = posting.external.threeTaps.category || categoryCode;
		}

		posting.categoryCode = categoryCode;
		db.postings.save(posting);
	});

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
