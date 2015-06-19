var
	ES_SUPPORTED_KEYWORDS = ['beginsWith', 'contains', 'endsWith', 'exact'],
	ES_SUPPORTED_FIELDS = ['heading', 'body', 'categoryCode', 'username'];


module.exports = (function (self) {
	'use strict';

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
							var term = {};
							term[field] = value;

							// push keyword to the keywords list
							queryContainer.push({
								term : term
							});
						});

					// if field value is not an array, use a match query
					} else {
						var match = {};
						match[field] = filters[filterType][field];

						// push keyword to the keywords list
						queryContainer.push({
							match : match
						});
					}

					// remove applied filter from filters
					delete filters[filterType][field];

					return;
				});
			}
		});
	}

	function applySourceFilters (sourceFilters, queryContainer) {
		sourceFilters.forEach(function (value) {
			// push source filter to the list
			queryContainer.push({
				term : {
					source : value
				}
			});
		});
	}

	self.buildGeoQuery = function (options, sourceFilters, callback) {
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

		// apply mandatory filters
		if (returnOptions.filters && returnOptions.filters.mandatory) {
			applyQueryFilters(
				returnOptions.filters.mandatory,
				query.query.filtered.query.bool.must);
		}

		// apply optional filters
		if (options.filters && options.filters.optional) {
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

		// apply source filters if there are any
		/* jshint sub : true */
		if (sourceFilters && sourceFilters.length) {
			query.query.filtered.query.bool['must_not'] = [];
			applySourceFilters(
				sourceFilters,
				query.query.filtered.query.bool['must_not']);
		}

		// return
		return setImmediate(function () {
			return callback(null, returnOptions, query);
		});
	};

	self.buildQuery = function (options, sourceFilters, callback) {
		var
			hasFilter = false,
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
							and : []
						}
					}
				},

				sort : [{
					createdAt : {
						order : 'desc'
					}
				}]
			},
			returnOptions = JSON.parse(JSON.stringify(options));

		// override default sort if applicable
		if (returnOptions.sort.asc || returnOptions.sort.desc) {
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
		if (options.filters && options.filters.optional) {
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

		// apply source filters if there are any
		/* jshint sub : true */
		if (sourceFilters && sourceFilters.length) {
			if (!hasFilter) {
				delete query.query.filtered.query.bool.must;
				delete query.query.filtered.filter;
			}

			hasFilter = true;

			query.query.filtered.query.bool['must_not'] = [];
			applySourceFilters(
				sourceFilters,
				query.query.filtered.query.bool['must_not']);
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

		// return
		return setImmediate(function () {
			return callback(null, returnOptions, query);
		});
	};

	return self;
}({}));
