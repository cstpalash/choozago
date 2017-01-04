var http = require('https');
var Promise = require('bluebird');
var pageAccessToken = "EAAFlw8fALDcBAIZCoPoTsXItFzkuHE0d8ZBD3gpkBZCI8ETb9fQQGBZAHyu4zgip0wx0jb4xOTUoFN1y9EuZArUB58f8s0CZCRQ571OxTW2HO4UMyMoNEJubYLdpwpR06FwGHO6PH5YDmjvlemsrVVWPQ06KUrPiDMuyrhh5B3gQZDZD";


var PromiseRequest = Promise.method(function(options) {
    return new Promise(function(resolve, reject) { 
        var request = http.request(options, function(response) {
            // Bundle the result
            var result = {
                'httpVersion': response.httpVersion,
                'httpStatusCode': response.statusCode,
                'headers': response.headers,
                'body': '',
                'trailers': response.trailers,
            };

            // Build the body
            response.on('data', function(chunk) {
                result.body += chunk;
            });

            // Resolve the promise when the response ends
            response.on('end', function() {
                resolve(result);
            });
        });

        // Handle errors
        request.on('error', function(error) {
            console.log('Problem with request:', error.message);
            reject(error);
        });

        // Must always call .end() even if there is no data being written to the request body
        request.end();
    });
});

function getProfile(userid){

    return PromiseRequest({
        method: 'GET',
        host: 'graph.facebook.com',
        path: '/v2.6/' + userid + '?access_token=' + pageAccessToken,
    }).then(function(value) {
        return JSON.parse(value.body);
    });
}

module.exports = {
  getProfile(userid) {
    return getProfile(userid);
  }
}

