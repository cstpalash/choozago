'use strict'

var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var configService = require("./configuration");
var statusTableName = "choozago.status";
var moment = require('moment');

function getCurrentParkingStatus(locationCode){
  
   var compareTime = moment().utcOffset("+05:30").startOf('day').unix();
    
   var params = {};
   params.TableName = statusTableName;
   params.Key = {date : compareTime , locationCode :locationCode };
	
   return dynamo.getItemAsync(params).then(function(dataDb){
	    
	    if(dataDb.Item){
	        
    	    return configService.getSlotConfiguration({"locationCode":locationCode}).then(function (totalSlotsData){
    	    
    	    var currentTotalSlots = totalSlotsData.totalSlots;
    	    
        	    if (currentTotalSlots) {
        				
        				var currentStatus = dataDb.Item;
        				
        				currentStatus.availableSlots = currentTotalSlots - ((currentStatus.booked)?currentStatus.booked:0 )- ((currentStatus.parked)?currentStatus.parked:0 );
        				
        				return currentStatus;
        		}
        			
            	return null;
            });
	    }
	    return null;
    });
}

module.exports = {
  getCurrentParkingStatus(data){
  	return getCurrentParkingStatus(data);
  }
}