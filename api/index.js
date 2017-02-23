var PAGE_ACCESS_TOKEN = "EAAFlw8fALDcBADm9l3cYw1jRCH6g5PZB77BYDIdTaiMn5UzMqdZC2FvwZB2VRCClcKl4U3ZCZCurO34w0lggRY7hk4xi6hBnFzZC0nTPYvCQZAHYEHiZC5rsZBNFxexmnSZCqL2RSlvVTTokqysZB1JWVdcxLv6rJvKv9vNw2jf0X08DAZDZD";
var API = "https://graph.facebook.com/v2.6/me/messages?access_token=" + PAGE_ACCESS_TOKEN; 
var requestify = require('requestify');
var format = text => (text && text.substring(0, 80));
var _ = require('lodash');
var botBuilder = require('claudia-bot-builder'),
    fbTemplate = botBuilder.fbTemplate;
var genericConfig = require("./config/generic");
var companyLocations = require("./config/companyLocations");
var configService = require("./service/configuration");
var moment = require('moment');
var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var ticketTableName = "choozago.ticket";

exports.handler = function (event, context) {
	var now = moment().utcOffset("+05:30"); //Indian time NOW
	const generic = new fbTemplate.Generic();
	switch(event.action){
		case "getUnixTimes":
			context.succeed(configService.getUnixTimes());
			break;
		case "updateSlotConfiguration" : 
			configService.updateConfiguration(event.data).then(function(data){
				context.succeed(data);
			});
			break;
		case "deleteSlotConfiguration" : 
			configService.deleteConfiguration(event.data).then(function(data){
				context.succeed(data);
			});
			break;
		case "getSlotConfiguration" : 
			configService.getSlotConfiguration(event.data).then(function(data){
				context.succeed(data);
			});
			break;
		case "getTicket" : 
			getTicketStatus(event.data.ticketId).then(function(ticket){
				context.succeed(ticket);
			});
			break;
		case "parkTicket" : 
			getTicketStatus(event.data.ticketId).then(function(ticket){
				if(ticket.status == "booked"){
					ticket.status = "parked";
					ticket.parkedtime = now.unix();
					updateTicket(ticket).then(function(d){
						var loc = _.find(getLocations(ticket.company), function(l) { return l.code == ticket.locationCode; });
						//notify user
						var ticketTitle = "Auto exit : " + now.clone().add(loc.ticketAutoExitInHours, 'h').format(genericConfig.dateDisplayFormat);
		

						var ticketDesc = "{status} by {firstName} {lastName} on " + now.format(genericConfig.dateDisplayFormat);
						ticketDesc = ticketDesc.replace("{status}", "parked")
												.replace("{firstName}", ticket.firstName)
												.replace("{lastName}", ticket.lastName);


						var image = loc.parked;

						generic
							.addBubble(format(ticketTitle), format(ticketDesc))
							.addImage(image)
					    	.addButton('Exit ticket', '#exit|' + ticket.ticketid);

					    notifyUser(generic.get(), ticket.userid).then(function(resp){
					    	context.succeed(ticket);
					    });
					});
				}
				else{
					var errorTemplate = "Ticket status is {currentStatus}, can not park.";
					context.fail({
						errorMessage : errorTemplate.replace('{currentStatus}', ticket.status),
						ticket : ticket
					});
				}
			});
			break;
		case "exitTicket" : 
			getTicketStatus(event.data.ticketId).then(function(ticket){
				if(ticket.status == "parked"){
					ticket.status = "exited";
					updateTicket(ticket).then(function(d){
						//notify user
					});
				}
				else{
					var errorTemplate = "Ticket status is {currentStatus}, can not exit.";
					context.fail({
						errorMessage : errorTemplate.replace('{currentStatus}', ticket.status),
						ticket : ticket
					});
				}
			});
			break;
		case "getStatus":
			
			break;
		default:
			context.fail({
				errorMessage : "Wrong payload"
			});
			break;
	}
};

function getTicketStatus(ticketId){
	var params = {};
    params.TableName = ticketTableName;
    params.Key = {ticketid : ticketId};

    return dynamo.getItemAsync(params).then(function(data){
    	return data.Item;
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