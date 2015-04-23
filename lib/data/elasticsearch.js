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

					// if field value is not an arry, use a match query
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

			query.query.filtered.filter.and.push({
				or : or
			});
		}

		// return
		return setImmediate(function () {
			return callback(null, returnOptions, query);
		});
	};

	return self;
}({}));
