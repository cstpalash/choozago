'use strict'

var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var configurationTableName = "choozago.configuration";
var moment = require('moment');

function getSlotConfiguration(data){
    
    var params = {
        TableName : configurationTableName,
        //IndexName :	userTimeIndex,
        KeyConditionExpression: "locationCode = :lcode and #btime <= :bt" ,
         ExpressionAttributeNames: {
            "#btime":"time",
        },
        ExpressionAttributeValues: {
            ":lcode":data.locationCode,
            ":bt": data.time
            },
        Limit:1,
        ScanIndexForward: false
    };
	
	return dynamo.queryAsync(params).then(function(dataDb){
	    
	    console.log("getSlotConfiguration")
	    console.log(dataDb)
	    
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
  }
}