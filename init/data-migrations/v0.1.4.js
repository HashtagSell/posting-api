/* global db */
/* jshint strict : false */

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

	// reverse lat/long to be long/lat for all postings
	db.postings.find().forEach(function (posting) {
		var coords = posting.geo ? posting.geo.coordinates : undefined;

		// set coords if empty
		if (typeof coords === 'undefined') {
			coords = [0, 0];
		}

		// reverse long and lat so that long is first element
		coords.splice(0, 2, coords[1], coords[0]);

		db.postings.update({
			postingId : posting.postingId
		}, {
			$set : {
				'geo.coordinates': coords
			}
		});
	});

	// re-add index as 2dsphere
	db.postings.ensureIndex({ 'geo.coordinates' : '2dsphere' });

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
