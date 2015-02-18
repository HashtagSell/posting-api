/**
 * Swaps 2d index for 2dsphere index on postings.geo.coordinates
 **/

var
	cursor,
	version = 'v0.1.4';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {
	// remove 2d index on geo.coordinates
	db.postings.dropIndex({ 'geo.coordinates' : '2d' });

	// re-add constraint correctly
	db.postings.ensureIndex({ 'geo.coordinates' : true }, { '2dsphere' : true });

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
