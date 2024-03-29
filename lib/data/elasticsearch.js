module.exports = (function (self) {
	'use strict';

	var
		// tokenizer = require('./tokenizer'),
		ANALYZED_FIELDS = [
			'body',
			'heading'],
		ES_SUPPORTED_KEYWORD_VALUE = {
			beginsWith : function (value) {
				return [value, '*'].join('');
			},
			contains : function (value) {
				return ['*', value, '*'].join('');
			},
			endsWith : function (value) {
				return ['*', value].join('');
			},
			exact : function (value) {
				return value;
			}
		},
		ES_SUPPORTED_KEYWORDS = Object.keys(ES_SUPPORTED_KEYWORD_VALUE),
		ES_SUPPORTED_FIELDS = [
			'body',
			'categoryCode',
			'heading',
			'location.city',
			'location.state',
			'username'];

	self = self || {};

	function applyQueryFilters (filters, queryContainer) {
		// iterate filter types (beginsWith, contains, etc.)
		Object.keys(filters).forEach(function (filterType) {

			// verify it's a filter type we can use to search in ES
			if (ES_SUPPORTED_KEYWORDS.indexOf(filterType) >= 0) {

				// iterate each filter field for the filter type
				Object.keys(filters[filterType]).forEach(function (field) {

					// verify the field is a supportable search field in ES
					if (ES_SUPPORTED_FIELDS.indexOf(field) < 0) {
						return;
					}

					// if field value is an array, use a term query
					if (Array.isArray(filters[filterType][field])) {
						filters[filterType][field].forEach(function (value) {
							// push keyword to the keywords list
							queryContainer.push(getTerm(
								field,
								ES_SUPPORTED_KEYWORD_VALUE[filterType](value)));
						});
					// if field value is not an array, use a match query
					} else if (ANALYZED_FIELDS.indexOf(field) >= 0) {
						queryContainer.push(getMatch(
							field,
							filters[filterType][field]));
					} else {
						queryContainer.push(getTerm(
							field,
							ES_SUPPORTED_KEYWORD_VALUE[filterType](filters[filterType][field])));
					}

					// remove applied filter from filters
					delete filters[filterType][field];

					return;
				});
			}
		});
	}

	function buildQuery (baseQuery, returnOptions) {
		var
			hasFilter = baseQuery ? true : false,
			query = baseQuery || {
				// only return ids
				fields : [],

				// the query itself
				query : {
					filtered : {
						query : {
							bool : {
								must : []
							}
						},
						filter : {
							and : []
						}
					}
				},

				sort : [{
					createdAt : {
						order : 'desc'
					}
				}]
			};

		// override default sort if applicable
		if (returnOptions.sort && (returnOptions.sort.asc || returnOptions.sort.desc)) {
			query.sort = [];

			if (returnOptions.sort.desc) {
				if (!(returnOptions.sort.desc instanceof Array)) {
					returnOptions.sort.desc = [returnOptions.sort.desc];
				}

				returnOptions.sort.desc.forEach(function (field) {
					var sortOption = {};
					sortOption[field] = {
						order : 'desc'
					};

					query.sort.push(sortOption);
				});
			}

			if (returnOptions.sort.asc) {
				if (!(returnOptions.sort.asc instanceof Array)) {
					returnOptions.sort.asc = [returnOptions.sort.asc];
				}

				returnOptions.sort.asc.forEach(function (field) {
					var sortOption = {};
					sortOption[field] = {
						order : 'asc'
					};

					query.sort.push(sortOption);
				});
			}

			// remove sort from the return options for phase 2 of the search
			delete returnOptions.sort;
		}

		// apply mandatory filters
		if (returnOptions.filters && returnOptions.filters.mandatory) {
			hasFilter = true;

			applyQueryFilters(
				returnOptions.filters.mandatory,
				query.query.filtered.query.bool.must);
		}

		// apply optional filters
		if (returnOptions.filters && returnOptions.filters.optional) {
			hasFilter = true;
			var or = [];

			applyQueryFilters(
				returnOptions.filters.optional,
				or);

			// only apply or when there are multiple parameters
			if (or.length > 1) {
				query.query.filtered.filter.and.push({
					or : or
				});
			}
		}

		// clean up elements of the query
		if (!query.query.filtered.filter.and.length) {
			delete query.query.filtered.filter;
		}

		// match all in the event of no query filters
		if (!hasFilter) {
			query.query = {
				'match_all' : {}
			};
		}

		// debugging output
		//console.log(JSON.stringify(query, 0, 2));

		// return
		return query;
	}

	function getMatch (field, value, isPhrase) {
		isPhrase = isPhrase || false;

		var filter = {
			match : {}
		};

		filter.match[field] = {
			query : value
		};

		if (isPhrase) {
			filter.match[field].type = 'phrase';
		} else {
			filter.match[field].operator = 'and';
		}

		return filter;
	}

	function getTerm (field, value) {
		var filter = {
			term : {}
		};

		filter.term[field] = value;

		return filter;
	}

	self.buildGeoQuery = function (options, callback) {
		var
			query = {
				// only return ids
				fields : [],

				// the query itself
				query : {
					filtered : {
						query : {
							bool : {
								must : []
							}
						},
						filter : {
							and : [{
								'geo_distance_range' : {
									gte : [options.geo.min, 'm'].join(''),
									lt : [options.geo.max, 'm'].join(''),
									'geo.coordinates' : {
										lat : options.geo.coords[1],
										lon : options.geo.coords[0]
									}
								}
							}]
						}
					}
				},

				// ensure that results are sorted by geo distance
				sort : [{
					'_geo_distance' : {
						'geo.coordinates' : {
							lat : options.geo.coords[1],
							lon : options.geo.coords[0]
						},
						order : 'asc',
						unit : 'm'
					}
				}]
			},
			returnOptions = JSON.parse(JSON.stringify(options));

		// remove geo as we are already applying it in the ES query
		delete returnOptions.geo;

		// when geo lookups are conducted, sorting is usurped by distance
		delete returnOptions.sort;

		// return
		return setImmediate(function () {
			return callback(
				null,
				returnOptions,
				// send in an overriding base query for geo lookup
				buildQuery(query, returnOptions));
		});
	};

	self.buildQuery = function (options, callback) {
		var returnOptions = JSON.parse(JSON.stringify(options));

		return setImmediate(function () {
			return callback(
				null,
				returnOptions,
				// not supplying base query to use default
				buildQuery(undefined, returnOptions));
		});
	};

	return self;
}({}));
