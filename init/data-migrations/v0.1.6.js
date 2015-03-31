/**
 * Creates a text index on the body field of the postings collection
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

	// make sure a text index exists for postings
	db.postings.ensureIndex({ 'body' : 'text' });

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
