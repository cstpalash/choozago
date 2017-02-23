'use strict'

var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var configurationTableName = "choozago.configuration";
var moment = require('moment');
var defaultTimeTemplate = "2000-01-01 {time}";

function getUnixTimes(){
    var returnData = [];
    
    var refDate = moment("2000-01-01 00:00", "YYYY-MM-DD HH:mm");
    
    var minutesAdded = 0;
    var intervalInMinutes = 15;
    
    while(minutesAdded < 24 * 60){
        
        returnData.push({ time : refDate.format("HH:mm"), unix : refDate.unix() });
        
        refDate.add(intervalInMinutes, "m");
        
        minutesAdded += intervalInMinutes;
    }
    
    return returnData;
}

function getSlotConfiguration(data){
    
    var compareTimeSegment = moment().utcOffset("+05:30").format("HH:mm");
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

function updateConfiguration(configurationData){
	var params = {};
    params.TableName = configurationTableName;
    params.Item = configurationData;

    return dynamo.putItemAsync(params).then(function(data){
    	return data;
    });
}

function deleteConfiguration(configurationData){
	var params = {};
    params.TableName = configurationTableName;
    params.Key = {"locationCode" : configurationData.locationCode, "time" : configurationData.time};

    return dynamo.deleteItemAsync(params).then(function(data){
    	return data;
    });
}

module.exports = {
  updateConfiguration(configurationData){
  	return updateConfiguration(configurationData);
  },
  deleteConfiguration(configurationData){
  	return deleteConfiguration(configurationData);
  },
  getSlotConfiguration(data){
    return getSlotConfiguration(data);
  },
  getUnixTimes(){
      return getUnixTimes();
  }
}