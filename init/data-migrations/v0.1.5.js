/**
 * Creates collection used to map between internal categories and Ebay categories
 **/

var
	cursor,
	version = 'v0.1.5';

// ensure versions table and index exists
db.versions.ensureIndex({ version : 1 }, { unique : true });

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {

	// make sure indexes exist for new collection
	db.ebayCategories.ensureIndex({ 'code' : 1 });

	db.ebayCategories.ensureIndex({ 'ebay.categoryId' : 1 });

	// animals and pets = 1281
	db.ebayCategories.insert({
		code : 'APET',
		ebay : {
			categoryId : '1281',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'ASUP',
		ebay : {
			categoryId : '1281',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'AOTH',
		ebay : {
			categoryId : '1281',
			siteId : 0
		}
	});

	// community = 99
	db.ebayCategories.insert({
		code : 'CCNW',
		ebay : {
			categoryId : '102329',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'COMM',
		ebay : {
			categoryId : '1305',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'CGRP',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'CLNF',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'CRID',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'CVOL',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'COTH',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	// dispatch = 417
	db.ebayCategories.insert({
		code : 'DDEL',
		ebay : {
			categoryId : '417',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'DISP',
		ebay : {
			categoryId : '417',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'DTAX',
		ebay : {
			categoryId : '4151',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'DTOW',
		ebay : {
			categoryId : '417',
			siteId : 0
		}
	});

	// for sale
	db.ebayCategories.insert({
		code : 'SANT',
		ebay : {
			categoryId : '20081',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SAPP',
		ebay : {
			categoryId : '11450',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SAPL',
		ebay : {
			categoryId : '20710',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SANC',
		ebay : {
			categoryId : '14339',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SKID',
		ebay : {
			categoryId : '2984',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SBAR',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SBIK',
		ebay : {
			categoryId : '177831',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SBIZ',
		ebay : {
			categoryId : '11759',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SCOL',
		ebay : {
			categoryId : '1',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SEDU',
		ebay : {
			categoryId : '11731',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SELE',
		ebay : {
			categoryId : '293',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SFNB',
		ebay : {
			categoryId : '14308',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SFUR',
		ebay : {
			categoryId : '3197',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SGAR',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SGFT',
		ebay : {
			categoryId : '172008',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SHNB',
		ebay : {
			categoryId : '26395',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SHNG',
		ebay : {
			categoryId : '11700',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SIND',
		ebay : {
			categoryId : '12576',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SJWL',
		ebay : {
			categoryId : '281',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SLIT',
		ebay : {
			categoryId : '267',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SMNM',
		ebay : {
			categoryId : '11232',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SMUS',
		ebay : {
			categoryId : '619',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SRES',
		ebay : {
			categoryId : '11759',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SSNF',
		ebay : {
			categoryId : '888',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'STIX',
		ebay : {
			categoryId : '1305',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'STOO',
		ebay : {
			categoryId : '61573',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'STOY',
		ebay : {
			categoryId : '220',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'STVL',
		ebay : {
			categoryId : '3252',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SWNT',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SOTH',
		ebay : {
			categoryId : '102492',
			siteId : 0
		}
	});

	// mature = 319
	db.ebayCategories.insert({
		code : 'MESC',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'MFET',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'MJOB',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'MMSG',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'MPNW',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'MSTR',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'MOTH',
		ebay : {
			categoryId : '319',
			siteId : 0
		}
	});

	// personals = 88433
	db.ebayCategories.insert({
		code : 'PMSM',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'PMSW',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'PWSM',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'PWSW',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'POTH',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	// real estate = 10542
	db.ebayCategories.insert({
		code : 'RCRE',
		ebay : {
			categoryId : '15825',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RHFR',
		ebay : {
			categoryId : '12605',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RHFS',
		ebay : {
			categoryId : '12605',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RSUB',
		ebay : {
			categoryId : '12605',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RSWP',
		ebay : {
			categoryId : '1607',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RLOT',
		ebay : {
			categoryId : '15841',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RPNS',
		ebay : {
			categoryId : '1607',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RSHR',
		ebay : {
			categoryId : '1607',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RVAC',
		ebay : {
			categoryId : '15897',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'RWNT',
		ebay : {
			categoryId : '1607',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'ROTH',
		ebay : {
			categoryId : '1607',
			siteId : 0
		}
	});

	// services = 316
	db.ebayCategories.insert({
		code : 'SVCC',
		ebay : {
			categoryId : '47126',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SVCE',
		ebay : {
			categoryId : '317',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SVCF',
		ebay : {
			categoryId : '317',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SVCM',
		ebay : {
			categoryId : '317',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SVCH',
		ebay : {
			categoryId : '317',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SVCP',
		ebay : {
			categoryId : '317',
			siteId : 0
		}
	});

	db.ebayCategories.insert({
		code : 'SVCO',
		ebay : {
			categoryId : '317',
			siteId : 0
		}
	});

	// uncategorized = 99
	db.ebayCategories.insert({
		code : 'ZOTH',
		ebay : {
			categoryId : '88433',
			siteId : 0
		}
	});

	// vehicles (siteId = 100, 6000)
	db.ebayCategories.insert({
		code : 'VAUT',
		ebay : {
			categoryId : '6001',
			siteId : 100
		}
	});

	db.ebayCategories.insert({
		code : 'VMOT',
		ebay : {
			categoryId : '6024',
			siteId : 100
		}
	});

	db.ebayCategories.insert({
		code : 'VMPT',
		ebay : {
			categoryId : '6028',
			siteId : 100
		}
	});

	db.ebayCategories.insert({
		code : 'VPAR',
		ebay : {
			categoryId : '6028',
			siteId : 100
		}
	});

	db.ebayCategories.insert({
		code : 'VOTH',
		ebay : {
			categoryId : '6028',
			siteId : 100
		}
	});

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
