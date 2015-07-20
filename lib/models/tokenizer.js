var
	REGEX_AND = /^and$/i,
	REGEX_OR = /^or$/i;

module.exports = (function (self) {
	'use strict';

	self.analyzeKeywords = function (query) {
		var keywords = [];

		if (typeof query === 'undefined') {
			return keywords;
		}

		query.split(/\s/g).forEach(function (word) {
			// normalize the word
			word = word
				.toLowerCase()
				.replace(REGEX_AND, '')
				.replace(REGEX_OR, '')
				.trim();

			if (word) {
				keywords.push(word);
			}
		});

		return keywords;
	};

	return self;
}({}));
