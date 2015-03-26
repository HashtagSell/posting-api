var
	os = require('os'),
	util = require('util'),

	countdown = require('countdown'),
	js2xmlparser = require('js2xmlparser'),
	request = require('request'),
	xml2js = require('xml2js'),

	DEFAULT_EBAY_CATEGORY = 88433,
	DEFAULT_ENDING_REASON = 'NotAvailable',
	DEFAULT_POSTAL_CODE = '94111',
	DEFAULT_SITE_ID = 0;

/**
 * How this code works, at a high level:
 *
 * For each eBay method below, a "template" represented as a POJO (Plain Ol'
 * Javascript Object) is populated with pertinent details from a HashtagSell
 * posting.
 *
 * Then, the POJO is serialized as XML and stuffed inside of the
 * XML envelope that is specified for that particlar eBay method. This XML
 * envelope is a string value that contains several string format characters -
 * `Util.format()` is used to "stuff" the serialized template XML into the
 * envelope as well as some basic authentication keys for the eBay API.
 *
 * Once the XML is constructed, the entire XML payload is POSTed to the eBay
 * API along with a set of HTTP headers that are specific to the API call.
 **/
module.exports = function (app, self) {
	'use strict';

	self = self || {};

	app.log.warn('eBay API token expires at %s', app.config.ebay.expires);

	var
		config = app.config.ebay,
		templates = {
			addFixedPriceItem : {
				Title : '',
				Description : '',
				PrimaryCategory : {
					CategoryID : ''
				},
				StartPrice : '',
				CategoryMappingAllowed : true,
				ConditionID : 1000,
				Country : 'US',
				Currency : 'USD',
				DispatchTimeMax : 3,
				/**
				 * From the XSD for the eBay API (http://developer.ebay.com/webservices/latest/ebaySvc.xsd)
				 * Accepted Values:
				 * Days_1
				 * Days_3
				 * Days_5
				 * Days_7
				 * Days_10
				 * Days_14
				 * Days_21
				 * Days_30
				 * Days_60
				 * Days_90
				 * Days_120
				 * GTC (this means "good til' cancelled")
				 **/
				ListingDuration : 'Days_7',
				ListingType : 'FixedPriceItem',
				PaymentMethods : 'PayPal',
				PayPalEmailAddress : config.paypalEmail,
				PictureDetails : {
					GalleryType : 'Gallery'
				},
				PostalCode : '',
				Quantity : 1,
				ReturnPolicy : {
					ReturnsAcceptedOption : 'ReturnsNotAccepted'
				},
				ShippingDetails : {
					ShippingType : 'Flat',
					ShippingServiceOptions : {
						FreeShipping : true,
						ShippingService : 'UPSGround',
						ShippingServicePriority : 1
					}
				},
				Site : 'US'
			}
		},
		xmlEnvelope = {
			addFixedPriceItem : [
				'<?xml version="1.0" encoding="utf-8"?>',
				'<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">',
				'	<ErrorLanguage>en_US</ErrorLanguage>',
				'	<WarningLevel>High</WarningLevel>',
				'	%s',
				'	<RequesterCredentials>',
				'		<eBayAuthToken>%s</eBayAuthToken>',
				'	</RequesterCredentials>',
				'	<WarningLevel>High</WarningLevel>',
				'</AddFixedPriceItemRequest>​'].join(os.EOL),
			endFixedPriceItem : [
				'<?xml version="1.0" encoding="utf-8"?>',
				'<EndFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">',
				'	<EndingReason EnumType="EndReasonCodeType">%s</EndingReason>',
				'	<ItemID>%s</ItemID>',
				'	<RequesterCredentials>',
				'		<eBayAuthToken>%s</eBayAuthToken>',
				'	</RequesterCredentials>',
				'	<ErrorLanguage>en_US</ErrorLanguage>',
				'	<WarningLevel>High</WarningLevel>',
				'</EndFixedPriceItemRequest>'].join(os.EOL),
			reviseFixedPriceItem : [
				'<?xml version="1.0" encoding="utf-8"?>',
				'<ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">',
				'	<ErrorLanguage>en_US</ErrorLanguage>',
				'	<WarningLevel>High</WarningLevel>',
				'	%s',
				'	<RequesterCredentials>',
				'		<eBayAuthToken>%s</eBayAuthToken>',
				'	</RequesterCredentials>',
				'	<WarningLevel>High</WarningLevel>',
				'</ReviseFixedPriceItemRequest>​'].join(os.EOL)
		};

	function getAddFixedPriceItemXML (posting, ebayCategory) {
		// ensure we have a category for the posting
		ebayCategory = ebayCategory || DEFAULT_EBAY_CATEGORY;

		// duplicate the template
		var ebayPosting = JSON.parse(JSON.stringify(templates.addFixedPriceItem));

		// set properties for the posting
		ebayPosting.PrimaryCategory.CategoryID = ebayCategory;
		ebayPosting.Title = posting.heading;
		ebayPosting.Description = posting.body;
		ebayPosting.StartPrice = posting.askingPrice.value;
		ebayPosting.PostalCode =
			(posting.geo && posting.geo.location) ?
				(posting.geo.location.postalCode || DEFAULT_POSTAL_CODE) :
				DEFAULT_POSTAL_CODE;

		// TODO: figure out the gallery

		// return the XML payload
		return util.format(
			xmlEnvelope.addFixedPriceItem,
			js2xmlparser(
				'Item',
				ebayPosting, {
					declaration : {
						include : false
					}
				}),
			config.token);
	}

	function getEndFixedPriceItemXML (itemId, reason) {
		// ensure we have a reason
		reason = reason || DEFAULT_ENDING_REASON;

		return util.format(
			xmlEnvelope.endFixedPriceItem,
			reason,
			itemId,
			config.token);
	}

	function getHeaders (apiCallName, siteId) {
		return {
			'X-EBAY-API-COMPATIBILITY-LEVEL' : '907',
			'X-EBAY-API-DEV-NAME' : config.devId,
			'X-EBAY-API-APP-NAME' : config.appId,
			'X-EBAY-API-CERT-NAME' : config.certId,
			'X-EBAY-API-SITEID' : siteId || DEFAULT_SITE_ID,
			'X-EBAY-API-CALL-NAME' : apiCallName
		};
	}

	function getResponseError (response, responseType) {
		var
			data,
			err;

		// validate input
		if (typeof responseType === 'undefined') {
			// if no response type is specified, grab the envelope property for
			// the response (i.e. AddFixedPriceItemResponse,
			// EndFixedPriceItemResponse, etc.)
			responseType = Object.keys(response)[0];
		}

		if (typeof response[responseType] === 'undefined') {
			err = new Error('unexpected response type from eBay request');
			err.body = response;

			return err;
		}

		data = response[responseType];
		if (data.Ack.indexOf('Failure') !== -1) {
			err = new Error('exceptions found in eBay response');
			err.details = [];

			data.Errors.forEach(function (e) {
				if (e.SeverityCode.indexOf('Error') !== -1) {
					err.details.push(e);
				}
			});

			return err;
		}
	}

	function getReviseFixedPriceItemXML (itemId, posting, ebayCategory) {
		// ensure we have a category for the posting
		ebayCategory = ebayCategory || DEFAULT_EBAY_CATEGORY;

		// duplicate the template (use the same template as add)
		var ebayPosting = JSON.parse(JSON.stringify(templates.addFixedPriceItem));

		// ensure ItemID is set (not in the template)
		ebayPosting.ItemID = itemId;

		// set properties for the posting
		ebayPosting.PrimaryCategory.CategoryID = ebayCategory;
		ebayPosting.Title = posting.heading;
		ebayPosting.Description = posting.body;
		ebayPosting.StartPrice = posting.askingPrice.value;
		ebayPosting.PostalCode =
			(posting.geo && posting.geo.location) ?
				(posting.geo.location.postalCode || DEFAULT_POSTAL_CODE) :
				DEFAULT_POSTAL_CODE;

		// TODO: figure out the gallery

		// return the XML payload
		return util.format(
			xmlEnvelope.reviseFixedPriceItem,
			js2xmlparser(
				'Item',
				ebayPosting, {
					declaration : {
						include : false
					}
				}),
			config.token);
	}

	// http://developer.ebay.com/Devzone/XML/docs/Reference/ebay/AddFixedPriceItem.html#AddFixedPriceItem
	self.create = function (posting, ebayCategory, siteId, callback) {
		var
			details = {},
			headers = getHeaders('AddFixedPriceItem', siteId),
			parser = new xml2js.Parser(),
			startTime = new Date(),
			xml = getAddFixedPriceItemXML(posting, ebayCategory);

		// execute request
		request({
			body : xml,
			headers : headers,
			method : 'POST',
			url : config.url
		}, function (err, res, body) {
			app.log.trace(
				'request to create fixed price post with eBay completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				return callback(err);
			}

			// TODO: determine if necessary and how and what to send...
			if (res && (res.statusCode < 200 || res.statusCode >= 300)) {
				app.log.error('status code %d returned from request', res.statusCode);
			}

			// parse response XML
			parser.parseString(body, function (err, result) {
				// check for errors in the response
				err = err || getResponseError(result);
				if (err) {
					return callback(err);
				}

				result = result.AddFixedPriceItemResponse;

				// ensure site ID is set
				details.siteId = siteId;

				if (result.ItemID && result.ItemID.length > 0) {
					details.itemId = parseInt(result.ItemID[0], 10);
					details.url = util.format(config.listingUrlFormat, details.itemId);
				}

				if (result.StartTime) {
					details.startTime = new Date(result.StartTime);
				}

				if (result.EndTime) {
					details.endTime = new Date(result.EndTime);
				}

				return callback(null, details);
			});
		});
	};

	// http://developer.ebay.com/Devzone/XML/docs/Reference/ebay/EndFixedPriceItem.html
	self.end = function (itemId, reason, siteId, callback) {
		if (typeof callback === 'undefined' && typeof siteId === 'function') {
			callback = siteId;

			if (isNaN(reason)) {
				siteId = DEFAULT_SITE_ID;
			} else {
				siteId = reason;
				reason = DEFAULT_ENDING_REASON;
			}
		}

		if (typeof callback === 'undefined' &&
			typeof siteId === 'undefined' &&
			typeof reason === 'function') {
			callback = reason;

			reason = DEFAULT_ENDING_REASON;
			siteId = DEFAULT_SITE_ID;
		}

		/**
		 * Acceptable reason codes:
		 *
		 * LostOrBroken
		 * NotAvailable
		 * Incorrect
		 * OtherListingError
		 * CustomCode
		 * SellToHighBidder
		 * Sold
		 *
		 **/

		var
			headers = getHeaders('EndFixedPriceItem', siteId),
			parser = new xml2js.Parser(),
			startTime = new Date(),
			xml = getEndFixedPriceItemXML(itemId, reason);

		// execute request
		request({
			body : xml,
			headers : headers,
			method : 'POST',
			url : config.url
		}, function (err, res, body) {
			app.log.trace(
				'request to end fixed price post with eBay completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				return callback(err);
			}

			// TODO: Handle this like a bawss
			if (res && (res.statusCode < 200 || res.statusCode >= 300)) {
				app.log.error('status code %d returned from request', res.statusCode);
			}

			// parse response XML
			parser.parseString(body, function (err, result) {
				// check for errors in the response
				err = err || getResponseError(result);
				if (err) {
					return callback(err);
				}

				return callback(null, result.EndFixedPriceItemResponse);
			});
		});
	};

	// http://developer.ebay.com/Devzone/XML/docs/Reference/eBay/ReviseFixedPriceItem.html
	self.revise = function (itemId, posting, ebayCategory, siteId, callback) {
		var
			details = {},
			headers = getHeaders('ReviseFixedPriceItem', siteId),
			parser = new xml2js.Parser(),
			startTime = new Date(),
			xml = getReviseFixedPriceItemXML(itemId, posting, ebayCategory);

		// execute request
		request({
			body : xml,
			headers : headers,
			method : 'POST',
			url : config.url
		}, function (err, res, body) {
			app.log.trace(
				'request to revise fixed price post with eBay completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				return callback(err);
			}

			// TODO: determine if necessary and how and what to send...
			if (res && (res.statusCode < 200 || res.statusCode >= 300)) {
				app.log.error('status code %d returned from request', res.statusCode);
			}

			// parse response XML
			parser.parseString(body, function (err, result) {
				// check for errors in the response
				err = err || getResponseError(result);
				if (err) {
					return callback(err);
				}

				// TODO: validate if update actually worked...
				result = result.ReviseFixedPriceItemResponse;
				app.log.trace(result);

				if (result.StartTime) {
					details.startTime = new Date(result.StartTime);
				}

				if (result.EndTime) {
					details.endTime = new Date(result.EndTime);
				}

				return callback();
			});
		});
	};

	return self;
};
