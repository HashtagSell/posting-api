var
    countdown = require('countdown'),
    request = require('request');


module.exports = function (app, self) {
    'use strict';

    self = self || {};

    var
        config = app.config.notifications;



    function tryParseJSON (body) {
        if (!body) {
            return null;
        }

        if (typeof body === 'object') {
            return body;
        }

        try {
            return JSON.parse(body);
        } catch (ex) {
            return null;
        }
    }



    self.queue = function (type, notification, callback) {
        callback = callback || function () {};

        app.log.trace(
            'queuing %s',
            type);

        var notificationStart = new Date();

        request({
            json : notification,
            method : 'POST',
            strictSSL : config.strictSSL,
            url : config.url + '/v1/queues/' + type
        }, function (err, res, body) {
            if (err) {
                return setImmediate(callback);
                //return next(err);
            }

            app.log.trace(
                'completed queuing of %s in %s',
                type,
                countdown(notificationStart, new Date(), countdown.MILLISECONDS));

            // parse the response body
            var json = tryParseJSON(body);
            if (!json) {
                json = {
                    response : body
                };
            }


            // check for unsuccessful status code
            if (!res || res.statusCode > 299 || res.statusCode < 200) {
                return (json || new Error('no response from server'));
            }

            return callback();
        });
    };

    return self;
};
