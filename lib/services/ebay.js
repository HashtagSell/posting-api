var
	os = require('os'),
	util = require('util'),

	countdown = require('countdown'),
	js2xmlparser = require('js2xmlparser'),
	request = require('request'),
	xml2js = require('xml2js'),

	DEFAULT_EBAY_CATEGORY = 88433,
	DEFAULT_POSTAL_CODE = '94111',
	DEFAULT_SITE_ID = 0;


module.exports = function (app, self) {
	'use strict';

	self = self || {};

	app.log.warn('eBay API token expires at %s', app.config.ebay.expires);

	var
		config = app.config.ebay,
		template = {
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
		},
		xmlEnvelope = [
			'<?xml version="1.0" encoding="utf-8"?>',
			'<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">',
			'	<ErrorLanguage>en_US</ErrorLanguage>',
			'	<WarningLevel>High</WarningLevel>',
			'	%s',
			'	<RequesterCredentials>',
			'		<eBayAuthToken>%s</eBayAuthToken>',
			'	</RequesterCredentials>',
			'	<WarningLevel>High</WarningLevel>',
			'</AddFixedPriceItemRequest>​'].join(os.EOL);

/*
<ShippingDetails>
	<ShippingType>Flat</ShippingType>
	<ShippingServiceOptions>
		<ShippingServicePriority>1</ShippingServicePriority>
		<ShippingService>UPSGround</ShippingService>
		<FreeShipping>true</FreeShipping>
		<ShippingServiceAdditionalCost>0.00</ShippingServiceAdditionalCost>
	</ShippingServiceOptions>
</ShippingDetails>
//*/

	function createEbayPostingXML (posting, ebayCategory) {
		ebayCategory = ebayCategory || DEFAULT_EBAY_CATEGORY;

		// duplicate the template and set properties from the posting
		var
			builder = new xml2js.Builder({
				headless : true,
				renderOpts : {
					pretty : true,
					indent : '  ',
					newline : os.EOL
				},
				rootName : 'Item'
			}),
			ebayPosting = JSON.parse(JSON.stringify(template));

		ebayPosting.PrimaryCategory.CategoryID = ebayCategory;
		ebayPosting.Title = posting.heading;
		ebayPosting.Description = posting.body;
		ebayPosting.StartPrice = posting.askingPrice.value;
		ebayPosting.PostalCode =
			posting.geo.location.postalCode || DEFAULT_POSTAL_CODE;

		// TODO: figure out the gallery

		// return the XML payload
		return util.format(
			xmlEnvelope,
			js2xmlparser(
				"Item",
				ebayPosting, {
					declaration : {
						include : false
					}
				}),
			config.token);
	}

	self.create = function (posting, ebayCategory, siteId, callback) {
		var
			ebayPostingXML = createEbayPostingXML(posting, ebayCategory),
			parser = new xml2js.Parser(),
			startTime = new Date();

		console.log(ebayPostingXML);

		request({
			body : ebayPostingXML,
			headers : {
				'X-EBAY-API-COMPATIBILITY-LEVEL' : '907',
				'X-EBAY-API-DEV-NAME' : config.devId,
				'X-EBAY-API-APP-NAME' : config.appId,
				'X-EBAY-API-CERT-NAME' : config.certId,
				'X-EBAY-API-SITEID' : siteId || DEFAULT_SITE_ID,
				'X-EBAY-API-CALL-NAME' : 'AddFixedPriceItem'
			},
			method : 'POST',
			url : config.url
		}, function (err, res, body) {
			app.log.trace(
				'request to create fixed price post with eBay completed in %s',
				countdown(startTime, new Date(), countdown.MILLISECONDS).toString());

			if (err) {
				return callback(err);
			}

			if (res && (res.statusCode < 200 || res.statusCode >= 300)) {
				// TODO: determine how and what to parse here...
				app.log.error('status code %d returned from request', res.statusCode);
			}

			// parse response XML
			parser.parseString(body, function (err, result) {
				if (err) {
					return callback(err);
				}

				app.log.info(result);

				return callback(null, result);
			});
		});
	};

	return self;
};
