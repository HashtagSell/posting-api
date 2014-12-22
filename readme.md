# Posting API

This is a central posting API for storing and retrieving posting details for hashtagsell.

## Object Model

Below is an example posting from the posting-api. In the comments next to each field, there is an indication of how postings from 3taps are mapped into the posting-api model. This API will support messages posted in either the 3taps format or in the posting-API native format, but will only return postings in the native posting-API format.

```javascript
var posting = {
  external : {
    source : {
      code : '',                    // 3taps item.source
      id : '',                      // 3taps item.external_id
      url : ''                      // 3taps item.external_url
    },
    threeTaps : {
      id : 1,                       // 3taps item.id
      category : '',                // 3taps item.category
      categoryGroup : '',           // 3taps item.category_group
      location : {
        city : '',                  // 3taps item.location.city
        country : '',               // 3taps item.location.country
        county : '',                // 3taps item.location.county
        formatted : '',             // 3taps item.location.formatted_address
        locality : '',              // 3taps item.location.locality
        metro : '',                 // 3taps item.location.metro
        region : '',                // 3taps item.location.region
        state : '',                 // 3taps item.location.state
        zipCode : '',               // 3taps item.location.zipcode
      },
      status : '',                  // 3taps item.status
      timestamp : 12345             // 3taps item.timestamp
    }
  },
  annotations : {},                 // 3taps item.annotations
  askingPrice : {
    currency : 'USD',               // 3taps item.currency
    value : ''                      // 3taps item.price
  },
  created : '2014-12-10T01:00:00Z'  // 3taps item.timestamp
  expires : '2014-12-10T06:29:00Z'  // 3taps item.expires
  geo : {
    accuracy : 0,                   // 3taps item.location.accuracy
    coordinates: [0, 0],            // 3taps [item.location.lat, item.location.long]
    status : 0                      // 3taps item.location.geolocation_status
  },
  body : 'required',                // 3taps item.body
  heading : 'required',             // 3taps item.heading
  images : {},                      // 3taps item.images
  language : 'EN',                  // 3taps item.language
  postingId : 'required'            // hashtagsell assigned ID
};
```

## Getting Started

### Dependencies

* Node v0.10
* MongoDB v2.6

A simple way to install and run Mongo locally is to use Homebrew (<http://brew.sh/>):

```bash
brew install mongo
```

### Get Code

To clone the repository and install dependencies, please perform the following:

```bash
git clone git@github.com:hashtagsell/posting-api.git
cd posting-api
npm install
```

For convenience you may find it useful to install `gulp` globally as well:

```bash
sudo npm install -g gulp
```

### Configuration

The server utilizes a mechanism for allowing configuration overrides by environment. To make use of this for a local environment, create a `local.json` configuration file in a new folder named `config` at the root of the application. The `.gitignore` has an entry to ignore this folder so that the local config won't trash other environment configurations.

```bash
mkdir ./config
touch ./config/local.json
```

Now put the following into the `local.json` configuration file:

```javascript
{
  "logging": {
    "level": "trace"
  },
  "server": {
    "port": 4043,
    "secure": true
  }
}
```

### Start It Up

#### Mongo DB

After installing all modules, gulp can assist you in starting Mongo (note, the gulp task `ensure-data-directory` only needs to be run once):

```bash
sudo gulp ensure-data-directory
gulp mongo-start
```

_Please Note: All mongo data for hashtagsell is placed into `/usr/local/var/mongodb/hashtagsell` by default_

#### API Server

When starting the API server, an environment configuration should be specified (see above for details on creating a `local.json` environment config). To specify the environment, use the `NODE_ENV` environment variable in the console to begin the process. The `npm start` script uses supervisor and pipes the output to Bunyan for logging:

```bash
NODE_ENV=local npm start
```

### Development

As changes are saved to .js files in the project, supervisor will automatically restart the server. It may be useful to periodically check the terminal to make sure a runtime unhandled exception isn't stopping the server. Additionally, using jshint may help to uncover potential problems before running code. The `npm test` script is connected to `gulp jshint` to help with this.

#### Pushing Branches / Pull Requests

Prior to pushing your branch to the remote to create a pull request, please ensure you've run the tests and verified and fixed any JSHint issues or failed unit tests:

```bash
npm test
```

After running `npm test` code coverage reports are created that can be viewed to determine if model changes have adequate code coverage prior to submission:

```bash
open ./reports/lcov-report/index.html
```

#### Application Structure

* init - x509 certs, Nginx config and Upstart config scripts are here
* lib - all application code resides in this folder
  * config - default configuration for the application - this should have a master set of all supported configuration keys
  * data - handles mapping of models to the underlying data storage systems - abstracts the database entirely away from all layers above it
  * models - relies on the data layer to store and retrieve model data - contains all logic related to the model including validation and sanitation
  * routes - relies on the model to support various resources exposed via the API
* test - all test code resides in this folder
