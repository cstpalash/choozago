var botBuilder = require('claudia-bot-builder'),
    fbTemplate = botBuilder.fbTemplate;
var format = text => (text && text.substring(0, 80));
var _ = require('lodash');
var location = require('./location');
var genericConfig = require("../config/generic");
var moment = require('moment');
const uuidV1 = require('uuid/v1');
var qr = require('qr-image');
var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var ticketTableName = "choozago.ticket";
var userTimeIndex ="userid-time-index";
var AWS = require('aws-sdk');
var s3 = Promise.promisifyAll(new AWS.S3());
var ticketBucketName = "choozago.ticket";
var parkingService = require('./parkingSlot');

function updateTicket(ticketData){
	var paramsDynamo = {};
    paramsDynamo.TableName = ticketTableName;
    paramsDynamo.Item = ticketData;

    return dynamo.putItemAsync(paramsDynamo).then(function(dataDb){
    	return dataDb;
    });
}

function getUserLastTicket(user){
	
   var params = {
        TableName : ticketTableName,
        IndexName :	userTimeIndex,
        KeyConditionExpression: "userid = :uid and #btime >= :bt" ,
         ExpressionAttributeNames: {
            "#btime":"time",
        },
        ExpressionAttributeValues: {
            ":uid":user.userid,
            ":bt": moment().utcOffset("+05:30").startOf('day').unix()
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

function getBookedTicketCard(ticketData){
	
	const generic = new fbTemplate.Generic();
	var ticketTitle = "Expires : " + moment.unix(ticketData.expiry).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			
	var bookParkTime = moment.unix((ticketData.status == "booked")? ticketData.time : ticketData.parkedtime).utcOffset("+05:30");
	var ticketDesc =  (ticketData.isAlreadyBooked || ticketData.isAlreadyParked) ? "Already " : ""
				ticketDesc = ticketDesc + "{status} by {firstName} {lastName} on " + bookParkTime.format(genericConfig.dateDisplayFormat);
				ticketDesc = ticketDesc.replace("{status}", ticketData.status)
										.replace("{firstName}", ticketData.firstName)
										.replace("{lastName}", ticketData.lastName);
	
	var loc = _.find(location.getLocations(ticketData.company), function(l) { return l.code == ticketData.locationCode; });
	var image = (ticketData.status == "booked")?loc.booked :loc.parked;
	
	generic
		.addBubble(format(ticketTitle), format(ticketDesc))
		.addImage(image)
		
	if ((ticketData.status == "booked")) {
		generic
			.addButton('Show QR code', '#qrcode|' + ticketData.ticketid)
			.addButton('Cancel ticket', '#cancel|' + ticketData.ticketid);
	}
	
	return generic.get();
	
}

function getTicketCard(ticketData){
	
	const generic = new fbTemplate.Generic();
	
	var loc = _.find(location.getLocations(ticketData.company), function(l) { return l.code == ticketData.locationCode; });
	var image = (ticketData.status == "booked")?loc.booked :loc.parked;
	
	var ticketTitle = ""
	var ticketDesc = ""
	var ticketTime = ""
	
	switch(ticketData.status)
	{
		case "expired" : 
			ticketTime = moment.unix(ticketData.expiredtime).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			ticketTitle = "Expired : " + ticketTime
			image = loc.expired;
			break;
		case "booked" :
			ticketTime = moment.unix(ticketData.time).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			ticketTitle = "Expires : " + moment.unix(ticketData.expiry).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			image = loc.booked;
			break;
		case "cancelled" : 
			ticketTime = moment.unix(ticketData.cancelledtime).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			ticketTitle = "Cancelled : " + ticketTime;
			image = loc.cancelled;
			break;
		case "exited" :
			ticketTime = moment.unix(ticketData.exitedtime).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			ticketTitle = "Exited : " + ticketTime;
			image = loc.exited;
			break;
		case "parked" : 
			ticketTime = moment.unix(ticketData.parkedtime).utcOffset("+05:30").format(genericConfig.dateDisplayFormat);
			ticketTitle = "Auto exit : " + moment.unix(ticketData.parkedtime).utcOffset("+05:30").clone().add(loc.ticketAutoExitInHours, 'h').format(genericConfig.dateDisplayFormat);
			image = loc.parked;
			break;
	}
	
	var ticketDesc =  ticketDesc + "{status} by {firstName} {lastName} on " + ticketTime;
	ticketDesc = ticketDesc.replace("{status}", ticketData.status)
										.replace("{firstName}", ticketData.firstName)
										.replace("{lastName}", ticketData.lastName);
										
	if(ticketData.status == 'expired')
		ticketDesc = "expired by Choozago on " + ticketTime;
	
	generic
		.addBubble(format(ticketTitle), format(ticketDesc))
		.addImage(image);
		
	if ((ticketData.status == "booked")) {
		generic
			.addButton('Show QR code', '#qrcode|' + ticketData.ticketid)
			.addButton('Cancel ticket', '#cancel|' + ticketData.ticketid);
	}
	else if ((ticketData.status == "parked")) {
		generic
			.addButton('Exit ticket', '#exit|' + ticketData.ticketid);
	}
	else{
		generic
			.addButton('Start again', '#start');
	}
	
	return generic.get();
	
}

function show(user){
	const generic = new fbTemplate.Generic();
	
	return getUserLastTicket(user).then(function(data) {
		
		if (data) {
			
			return getTicketCard(data);
		}
		else{
			return "You have not booked any ticket yet."
		}
	
	})
	
}

function book(user){
	
	return parkingService.getCurrentParkingStatus(user.location).then(function(data){
    
    	var availableParking = (data && data.availableSlots)?data.availableSlots :0;
    	
    	if (availableParking == 0) {
    		
    		return "No parkimg slot is available at the moment,Please try after sometime."
    	}
    	
		const generic = new fbTemplate.Generic();
	
		return getUserLastTicket(user).then(function(data) {
			
			if (data && (data.status == "booked" || data.status == "parked" ) ) {
				
				data.isAlreadyBooked = data.status == "booked";
				data.isAlreadyParked = data.status == "parked";
				return getBookedTicketCard(data);
			}
		
			var loc = _.find(location.getLocations(user.company), function(l) { return l.code == user.location; });
			if(loc){
				var now = moment().utcOffset("+05:30"); //Indian time NOW
				var expiry = now.clone().add(loc.ticketExpiryInHours, 'h');
				var ticketId = uuidV1();
				var status = "booked";
		
				var ticketData = {
					ticketid : ticketId,
					userid : user.userid,
					time : now.unix(),
					expiry : expiry.unix(),
					status : status,
					company : user.company,
					locationCode : loc.code,
					locationDesc : loc.name
				};
				if(user.firstName) ticketData.firstName = user.firstName;
				if(user.lastName) ticketData.lastName = user.lastName;
				if(user.profilePic) ticketData.profilePic = user.profilePic;
		
			    return updateTicket(ticketData).then(function(data){
			    	
			    	return getBookedTicketCard(ticketData);
			   
			    });
				
			}
			else{
				return "Something went wrong, please try again."
			}
		})
	});
}

function qrcode(user, ticketId){

	var params = {};
    params.TableName = ticketTableName;
    params.Key = {ticketid : ticketId};

    return dynamo.getItemAsync(params).then(function(data){
    	if(data.Item && data.Item.qrurl){

			return new fbTemplate
				.Image(data.Item.qrurl)
				.get();
    	}
    	else{
    		var ctx = genericConfig.qrScanUrlTemplate.replace("{ticketId}", ticketId);
    		var qrImg = qr.imageSync(ctx);

    		var s3Params = {
    			Bucket : ticketBucketName,
    			Key : ticketId + ".png",
    			Body : qrImg,
    			ACL: 'public-read',
    			ContentType: 'image/png'
    		};

    		return s3.uploadAsync(s3Params).then(function(dataS3) {
			  	data.Item.qrurl = dataS3.Location;

			    return updateTicket(data.Item).then(function(dataDb){
			    	return new fbTemplate
				      .Image(dataS3.Location)
				      .get();
			    });
			});
    	}
    });
}

function exit(user, ticketId){

	var params = {};
    params.TableName = ticketTableName;
    params.Key = {ticketid : ticketId};

    var now = moment().utcOffset("+05:30"); //Indian time NOW

    return dynamo.getItemAsync(params).then(function(data){
    	if(data.Item && data.Item.status == "parked"){

    		var ticket = data.Item;
    		ticket.status = "exited";
    		ticket.exitedtime = now.unix();

    		return updateTicket(ticket).then(function(updatedTicket){
    			const generic = new fbTemplate.Generic();

	    		var loc = _.find(location.getLocations(ticket.company), function(l) { return l.code == ticket.locationCode; });
				if(loc){
					var ticketTitle = "Exited : Slot will be released. Thank you.";
			

					var ticketDesc = "{status} by {firstName} {lastName} on " + now.format(genericConfig.dateDisplayFormat);
					ticketDesc = ticketDesc.replace("{status}", "Exited")
											.replace("{firstName}", ticket.firstName)
											.replace("{lastName}", ticket.lastName);


					var image = loc.exited;

					generic
						.addBubble(format(ticketTitle), format(ticketDesc))
						.addImage(image)
						.addButton('Start again', '#start');

					return generic.get();

				}
				else{
					return "Something went wrong, please try again."
				}

    		});

    		
    	}
    	else{
    		return "Can't exit your ticket, only 'parked' ticket can be exited."
    	}
    });
}

function cancel(user, ticketId){

	var params = {};
    params.TableName = ticketTableName;
    params.Key = {ticketid : ticketId};

    var now = moment().utcOffset("+05:30"); //Indian time NOW

    return dynamo.getItemAsync(params).then(function(data){
    	if(data.Item && data.Item.status == "booked"){

    		var ticket = data.Item;
    		ticket.status = "cancelled";
    		ticket.cancelledtime = now.unix();

    		return updateTicket(ticket).then(function(updatedTicket){
    			const generic = new fbTemplate.Generic();

	    		var loc = _.find(location.getLocations(ticket.company), function(l) { return l.code == ticket.locationCode; });
				if(loc){
					var ticketTitle = "Cancelled : Slot will be released. Thank you.";
			

					var ticketDesc = "{status} by {firstName} {lastName} on " + now.format(genericConfig.dateDisplayFormat);
					ticketDesc = ticketDesc.replace("{status}", "Cancelled")
											.replace("{firstName}", ticket.firstName)
											.replace("{lastName}", ticket.lastName);


					var image = loc.cancelled;

					generic
						.addBubble(format(ticketTitle), format(ticketDesc))
						.addImage(image)
						.addButton('Start again', '#start');

					return generic.get();

				}
				else{
					return "Something went wrong, please try again."
				}

    		});

    		
    	}
    	else{
    		return "Can't cancel your ticket, only 'booked' ticket can be cancelled."
    	}
    });
}

module.exports = {
  book(user) {
    return book(user);
  },
  qrcode(user, ticketId) {
    return qrcode(user, ticketId);
  },
  exit(user, ticketId){
  	return exit(user, ticketId);
  },
  cancel(user, ticketId){
  	return cancel(user, ticketId);
  },
  show(user) {
    return show(user);
  }
}