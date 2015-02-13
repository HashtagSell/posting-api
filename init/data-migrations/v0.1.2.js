/**
 * Creates groupings collection for all categories
 **/

var
	categories = [{
			"code": "APET",
			"group": {
				"code": "AAAA",
				"name": "Animals",
			},
			"name": "Pets"
		},
		{
			"code": "ASUP",
			"group": {
				"code": "AAAA",
				"name": "Animals",
			},
			"name": "Supplies"
		},
		{
			"code": "AOTH",
			"group": {
				"code": "AAAA",
				"name": "Animals",
			},
			"name": "Other"
		},
		{
			"code": "CCNW",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Classes & Workshops"
		},
		{
			"code": "COMM",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Events"
		},
		{
			"code": "CGRP",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Groups"
		},
		{
			"code": "CLNF",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Lost & Found"
		},
		{
			"code": "CRID",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Rideshares"
		},
		{
			"code": "CVOL",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Volunteers"
		},
		{
			"code": "COTH",
			"group": {
				"code": "CCCC",
				"name": "Community",
			},
			"name": "Other"
		},
		{
			"code": "DDEL",
			"group": {
				"code": "DISP",
				"name": "Dispatch",
			},
			"name": "Delivery"
		},
		{
			"code": "DISP",
			"group": {
				"code": "DISP",
				"name": "Dispatch",
			},
			"name": "Dispatch"
		},
		{
			"code": "DTAX",
			"group": {
				"code": "DISP",
				"name": "Dispatch",
			},
			"name": "Taxi"
		},
		{
			"code": "DTOW",
			"group": {
				"code": "DISP",
				"name": "Dispatch",
			},
			"name": "Tow"
		},
		{
			"code": "SANT",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Antiques"
		},
		{
			"code": "SAPP",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Apparel"
		},
		{
			"code": "SAPL",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Appliances"
		},
		{
			"code": "SANC",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Art & Crafts"
		},
		{
			"code": "SKID",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Babies & Kids"
		},
		{
			"code": "SBAR",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Barters"
		},
		{
			"code": "SBIK",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Bicycles"
		},
		{
			"code": "SBIZ",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Businesses"
		},
		{
			"code": "SCOL",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Collections"
		},
		{
			"code": "SEDU",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Educational"
		},
		{
			"code": "SELE",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Electronics & Photo"
		},
		{
			"code": "SFNB",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Food & Beverage"
		},
		{
			"code": "SFUR",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Furniture"
		},
		{
			"code": "SGAR",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Garage Sales"
		},
		{
			"code": "SGFT",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Gift Cards"
		},
		{
			"code": "SHNB",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Health & Beauty"
		},
		{
			"code": "SHNG",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Home & Garden"
		},
		{
			"code": "SIND",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Industrial"
		},
		{
			"code": "SJWL",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Jewelry"
		},
		{
			"code": "SLIT",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Literature"
		},
		{
			"code": "SMNM",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Movies & Music"
		},
		{
			"code": "SMUS",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Musical Instruments"
		},
		{
			"code": "SRES",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Restaurants"
		},
		{
			"code": "SSNF",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Sports & Fitness"
		},
		{
			"code": "STIX",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Tickets"
		},
		{
			"code": "STOO",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Tools"
		},
		{
			"code": "STOY",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Toys & Hobbies"
		},
		{
			"code": "STVL",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Travel"
		},
		{
			"code": "SWNT",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Wanted"
		},
		{
			"code": "SOTH",
			"group": {
				"code": "SSSS",
				"name": "For Sale",
			},
			"name": "Other"
		},
		{
			"code": "JACC",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Accounting"
		},
		{
			"code": "JADM",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Administrative"
		},
		{
			"code": "JAER",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Aerospace & Defense"
		},
		{
			"code": "JANL",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Analyst"
		},
		{
			"code": "JANA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Animals & Agriculture"
		},
		{
			"code": "JARC",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Architecture"
		},
		{
			"code": "JART",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Art"
		},
		{
			"code": "JAUT",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Automobile"
		},
		{
			"code": "JBEA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Beauty"
		},
		{
			"code": "JBIZ",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Business Development"
		},
		{
			"code": "JWEB",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Computer & Web"
		},
		{
			"code": "JCST",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Construction & Facilities"
		},
		{
			"code": "JCON",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Consulting"
		},
		{
			"code": "JCUS",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Customer Service"
		},
		{
			"code": "JDES",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Design"
		},
		{
			"code": "JEDU",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Education"
		},
		{
			"code": "JENE",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Energy"
		},
		{
			"code": "JENG",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Engineering"
		},
		{
			"code": "JENT",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Entertainment & Media"
		},
		{
			"code": "JEVE",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Events"
		},
		{
			"code": "JFIN",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Finance"
		},
		{
			"code": "JFNB",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Food & Beverage"
		},
		{
			"code": "JGIG",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Gigs"
		},
		{
			"code": "JGOV",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Government"
		},
		{
			"code": "JHEA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Healthcare"
		},
		{
			"code": "JHOS",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Hospitality & Travel"
		},
		{
			"code": "JHUM",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Human Resources"
		},
		{
			"code": "JMNT",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Installation, Maintenance & Repair"
		},
		{
			"code": "JINS",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Insurance"
		},
		{
			"code": "JINT",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "International"
		},
		{
			"code": "JLAW",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Law Enforcement"
		},
		{
			"code": "JLEG",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Legal"
		},
		{
			"code": "JMAN",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Management & Directorship"
		},
		{
			"code": "JMFT",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Manufacturing & Mechanical"
		},
		{
			"code": "JMAR",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Marketing, Advertising & Public Relations"
		},
		{
			"code": "JNON",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Non-Profit"
		},
		{
			"code": "JOPS",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Operations & Logistics"
		},
		{
			"code": "JPHA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Pharmaceutical"
		},
		{
			"code": "JPRO",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Product, Project & Program Management"
		},
		{
			"code": "JPUR",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Purchasing"
		},
		{
			"code": "JQUA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Quality Assurance"
		},
		{
			"code": "JREA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Real Estate"
		},
		{
			"code": "JREC",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Recreation"
		},
		{
			"code": "JRES",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Resumes"
		},
		{
			"code": "JRNW",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Retail & Wholesale"
		},
		{
			"code": "JSAL",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Sales"
		},
		{
			"code": "JSCI",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Science"
		},
		{
			"code": "JSEC",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Security"
		},
		{
			"code": "JSKL",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Skilled Trade & General Labor"
		},
		{
			"code": "JTEL",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Telecommunications"
		},
		{
			"code": "JTRA",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Transportation"
		},
		{
			"code": "JVOL",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Volunteer"
		},
		{
			"code": "JWNP",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Writing & Publishing"
		},
		{
			"code": "JOTH",
			"group": {
				"code": "JJJJ",
				"name": "Jobs",
			},
			"name": "Other"
		},
		{
			"code": "MESC",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Escorts"
		},
		{
			"code": "MFET",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Fetish"
		},
		{
			"code": "MJOB",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Jobs"
		},
		{
			"code": "MMSG",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Massage"
		},
		{
			"code": "MPNW",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Phone & Websites"
		},
		{
			"code": "MSTR",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Strippers"
		},
		{
			"code": "MOTH",
			"group": {
				"code": "MMMM",
				"name": "Mature",
			},
			"name": "Other"
		},
		{
			"code": "PMSM",
			"group": {
				"code": "PPPP",
				"name": "Personals",
			},
			"name": "Men Seeking Men"
		},
		{
			"code": "PMSW",
			"group": {
				"code": "PPPP",
				"name": "Personals",
			},
			"name": "Men Seeking Women"
		},
		{
			"code": "PWSM",
			"group": {
				"code": "PPPP",
				"name": "Personals",
			},
			"name": "Women Seeking Men"
		},
		{
			"code": "PWSW",
			"group": {
				"code": "PPPP",
				"name": "Personals",
			},
			"name": "Women Seeking Women"
		},
		{
			"code": "POTH",
			"group": {
				"code": "PPPP",
				"name": "Personals",
			},
			"name": "Other"
		},
		{
			"code": "RCRE",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Commercial Real Estate"
		},
		{
			"code": "RHFR",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Housing For Rent"
		},
		{
			"code": "RHFS",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Housing For Sale"
		},
		{
			"code": "RSUB",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Housing Sublets"
		},
		{
			"code": "RSWP",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Housing Swaps"
		},
		{
			"code": "RLOT",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Lots & Land"
		},
		{
			"code": "RPNS",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Parking & Storage"
		},
		{
			"code": "RSHR",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Room Shares"
		},
		{
			"code": "RVAC",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Vacation Properties"
		},
		{
			"code": "RWNT",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Want Housing"
		},
		{
			"code": "ROTH",
			"group": {
				"code": "RRRR",
				"name": "Real Estate",
			},
			"name": "Other"
		},
		{
			"code": "SVCC",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Creative"
		},
		{
			"code": "SVCE",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Education"
		},
		{
			"code": "SVCF",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Financial"
		},
		{
			"code": "SVCM",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Health"
		},
		{
			"code": "SVCH",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Household"
		},
		{
			"code": "SVCP",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Professional"
		},
		{
			"code": "SVCO",
			"group": {
				"code": "SVCS",
				"name": "Services",
			},
			"name": "Other"
		},
		{
			"code": "ZOTH",
			"group": {
				"code": "ZZZZ",
				"name": "Uncategorized",
			},
			"name": "Other"
		},
		{
			"code": "VAUT",
			"group": {
				"code": "VVVV",
				"name": "Vehicles",
			},
			"name": "Autos"
		},
		{
			"code": "VMOT",
			"group": {
				"code": "VVVV",
				"name": "Vehicles",
			},
			"name": "Motorcycles"
		},
		{
			"code": "VMPT",
			"group": {
				"code": "VVVV",
				"name": "Vehicles",
			},
			"name": "Motorcycle Parts"
		},
		{
			"code": "VPAR",
			"group": {
				"code": "VVVV",
				"name": "Vehicles",
			},
			"name": "Parts"
		},
		{
			"code": "VOTH",
			"group": {
				"code": "VVVV",
				"name": "Vehicles",
			},
			"name": "Other"
		}],
		cursor,
		version = 'v0.1.2';

// create query to determine if this version exists
cursor = db.versions.find({ version : version }).limit(1);

// check if version exists
if (!cursor.hasNext()) {
	// create collection for groupings of categories and ensure indexes
	db.groupings.ensureIndex({ code : 1 }, { unique : true });
	db.groupings.ensureIndex({ 'categories.code' : 1 }, { unique : true });

	// populate the categories collection
	categories.forEach(function (category) {
		db.groupings.insert({
			code : category.group.code.toUpperCase(),
			name : category.group.name
				.replace(/\&/g, 'and')
				.toLowerCase()
				.trim()
		});

		db.groupings.update(
			{ code : category.group.code.toUpperCase() },
			{ $addToSet : {
				categories : {
					code : category.code.toUpperCase(),
					name : category.name
					.replace(/\&/g, 'and')
					.toLowerCase()
					.trim()
				}
			}});
	});

	// insert version for future migration runs
	db.versions.insert({
		appliedAt : new Date(),
		version : version
	});
}
