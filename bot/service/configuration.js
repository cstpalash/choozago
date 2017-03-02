'use strict'

var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var configurationTableName = "choozago.configuration";
var moment = require('moment');
var companyLocations = require("../config/companyLocations");
var _ = require('lodash');
var defaultTimeTemplate = "2000-01-01 {time}";

function getLocations(companyCode){
	return companyLocations[companyCode] ? companyLocations[companyCode] : [];
}


function getSlotConfiguration(data){
    
    var loc = _.find(getLocations("rbs-india"), function(l) { return l.code == data.locationCode; });
    
    var compareTimeSegment = moment().utcOffset("+05:30").add(loc.ticketExpiryInHours, 'h').format("HH:mm");
    if(data.time){
        compareTimeSegment = data.time;
    }
    
    var compareTime = moment(defaultTimeTemplate.replace("{time}", compareTimeSegment), "YYYY-MM-DD HH:mm").unix();
    
    var params = {
        TableName : configurationTableName,
        KeyConditionExpression: "locationCode = :lcode and #btime <= :bt" ,
         ExpressionAttributeNames: {
            "#btime":"time",
        },
        ExpressionAttributeValues: {
            ":lcode":data.locationCode,
            ":bt": compareTime
            },
        Limit:1,
        ScanIndexForward: false
    };
	
	return dynamo.queryAsync(params).then(function(dataDb){
	    
		if (dataDb && dataDb.Items.length > 0) {
				
				return dataDb.Items[0];
			}
    	return null;
    });
}

module.exports = {
  getSlotConfiguration(data){
    return getSlotConfiguration(data);
  }
}