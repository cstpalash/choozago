var PAGE_ACCESS_TOKEN = "EAAFlw8fALDcBADm9l3cYw1jRCH6g5PZB77BYDIdTaiMn5UzMqdZC2FvwZB2VRCClcKl4U3ZCZCurO34w0lggRY7hk4xi6hBnFzZC0nTPYvCQZAHYEHiZC5rsZBNFxexmnSZCqL2RSlvVTTokqysZB1JWVdcxLv6rJvKv9vNw2jf0X08DAZDZD";
var API = "https://graph.facebook.com/v2.6/me/messages?access_token=" + PAGE_ACCESS_TOKEN; 
var requestify = require('requestify');
var format = text => (text && text.substring(0, 80));
var _ = require('lodash');
var botBuilder = require('claudia-bot-builder'),
    fbTemplate = botBuilder.fbTemplate;
var genericConfig = require("./config/generic");
var companyLocations = require("./config/companyLocations");
var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var moment = require('moment');
var ticketTableName = 'choozago.ticket';

exports.handler = function (event, context, callback) {
    
    var now = moment().utcOffset("+05:30");
    console.log("Scheduler runs at : " + now.format("YYYY-MM-DD HH:mm"));
    
    var allTickets = [];
    
    var params = {
        TableName : ticketTableName,
        IndexName : "status-expiry-index",
        KeyConditionExpression: "#stat = :st and expiry <= :currentTime" ,
        ExpressionAttributeNames: {
            "#stat":"status",
        },
        ExpressionAttributeValues: {
            ":st":"booked",
            ":currentTime": now.unix()
        }
    };
	
	scanAll(params, allTickets).then(function(list){
	    
	    var allPromises = [];
	    
	    list.forEach(function(t) {
            allPromises.push(expireTicket(t, now));
        });
        
        Promise.all(allPromises).then(function(values){
            callback(null, 'Precessed : ' + values.length);
        }, function(err){
            callback(err, null);
        });
	});
};

function expireTicket(ticket, timeNow){
    const generic = new fbTemplate.Generic();
    var loc = _.find(getLocations(ticket.company), function(l) { return l.code == ticket.locationCode; });
    ticket.status = "expired";
	ticket.expiredtime = timeNow.unix();
	
	return updateTicket(ticket).then(function(d){
	    //notify user
		var ticketTitle = "Expired : " + timeNow.format(genericConfig.dateDisplayFormat);


		var ticketDesc = "{status} by {firstName} {lastName} on " + timeNow.format(genericConfig.dateDisplayFormat);
		ticketDesc = ticketDesc.replace("{status}", 'expired')
										.replace("{firstName}", ticket.firstName)
										.replace("{lastName}", ticket.lastName);


		var image = loc.expired;

		generic
			.addBubble(format(ticketTitle), format(ticketDesc))
			.addImage(image)
	    	.addButton('Start again', '#start');

	    return notifyUser(generic.get(), ticket.userid).then(function(resp){
	    	return resp;
	    });
	});
}

function updateTicket(ticketData){
	var paramsDynamo = {};
    paramsDynamo.TableName = ticketTableName;
    paramsDynamo.Item = ticketData;

    return dynamo.putItemAsync(paramsDynamo).then(function(dataDb){
    	return dataDb;
    });
}

function getLocations(companyCode){
	return companyLocations[companyCode] ? companyLocations[companyCode] : [];
}

function notifyUser(notificationMessage, userid){
    
    var pushData = {
      "recipient":{
        "id": ""
      },
      "message": notificationMessage
    };

    pushData.recipient.id = userid;

    return requestify.post(API, pushData).then(function(response){
        return response;
    });
}

function scanAll(params, allTickets) {
    return dynamo.queryAsync(params).then(function(dataDb){
		dataDb.Items.forEach(function(ticket) {
            allTickets.push(ticket);
        });
        
        if(dataDb.LastEvaluatedKey){
            console.log("scanning more...");
            params.ExclusiveStartKey = dataDb.LastEvaluatedKey;
            return scanAll(params, allTickets);
        }
        else{
            return allTickets;
        }
    });
}