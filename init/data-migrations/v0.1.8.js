/* global db */
/* jshint strict : false */

/**
 * Removes extraneous indexes from postings table to attempt to increase
 * efficiency of posting-sync-agent
 **/

var
	cursor,
	version = 'v0.1.8';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {

	db.postings.dropIndex('external.threeTaps.category_1');
	db.postings.dropIndex('external.threeTaps.categoryGroup_1');
	db.postings.dropIndex('external.threeTaps.location.city_1');
	db.postings.dropIndex('external.threeTaps.location.country_1');
	db.postings.dropIndex('external.threeTaps.location.county_1');
	db.postings.dropIndex('external.threeTaps.location.locality_1');
	db.postings.dropIndex('external.threeTaps.location.metro_1');
	db.postings.dropIndex('external.threeTaps.location.region_1');
	db.postings.dropIndex('external.threeTaps.location.state_1');
	db.postings.dropIndex('external.threeTaps.location.zipCode_1');
	db.postings.dropIndex('external.threeTaps.status_1');
	db.postings.dropIndex('external.threeTaps.timestamp_1');
	db.postings.dropIndex('geo.coordinates_2dsphere');
	db.postings.dropIndex('language_1');

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
