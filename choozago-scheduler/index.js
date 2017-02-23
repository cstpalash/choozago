var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var moment = require('moment');
var ticketTableName = 'choozago.ticket';

exports.handler = function (event, context, callback) {
    
    var now = moment().utcOffset("+05:30");
    console.log("Scheduler runs at : " + now.format("YYYY-MM-DD HH:mm"));
    
    callback(null, {});
};