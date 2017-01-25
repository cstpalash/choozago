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
var AWS = require('aws-sdk');
var s3 = Promise.promisifyAll(new AWS.S3());
var ticketBucketName = "choozago.ticket";

function book(user){
	const generic = new fbTemplate.Generic();
	

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

		var params = {};
	    params.TableName = ticketTableName;
	    params.Item = ticketData;

	    return dynamo.putItemAsync(params).then(function(data){
	    	var ticketTitle = "Expires : " + expiry.format(genericConfig.dateDisplayFormat);
		

			var ticketDesc = "{status} by {firstName} {lastName} on " + now.format(genericConfig.dateDisplayFormat);
			ticketDesc = ticketDesc.replace("{status}", status)
									.replace("{firstName}", user.firstName)
									.replace("{lastName}", user.lastName);


			var image = loc.booked;

			generic
				.addBubble(format(ticketTitle), format(ticketDesc))
				.addImage(image)
				.addButton('Show QR code', '#qrcode|' + ticketId)
		    	.addButton('Cancel ticket', '#cancel|' + ticketId);

			return generic.get();
	    });
		
	}
	else{
		return "Something went wrong, please try again."
	}
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

			  	var paramsDynamo = {};
			    paramsDynamo.TableName = ticketTableName;
			    paramsDynamo.Item = data.Item;

			    return dynamo.putItemAsync(paramsDynamo).then(function(dataDb){
			    	return new fbTemplate
				      .Image(dataS3.Location)
				      .get();
			    });
			});
    	}
    });
}

function park(user){
	const generic = new fbTemplate.Generic();

	var loc = _.find(location.getLocations(user.company), function(l) { return l.code == user.location; });
	if(loc){
		var ticketTitle = "(B1-A208) Expires : 10:05AM, 5th Jan 2017";
		

		var ticketDesc = "{status} by {firstName} {lastName} on 09:50AM, 5th Jan 2017";
		ticketDesc = ticketDesc.replace("{status}", "Parked")
								.replace("{firstName}", user.firstName)
								.replace("{lastName}", user.lastName);


		var image = loc.parked;

		generic
			.addBubble(format(ticketTitle), format(ticketDesc))
			.addImage(image)
			.addButton('Exit my vehicle', '#exit');

		return generic.get();
	}
	else{
		return "Something went wrong, please try again."
	}
}

function exit(user){
	const generic = new fbTemplate.Generic();

	var loc = _.find(location.getLocations(user.company), function(l) { return l.code == user.location; });
	if(loc){
		var ticketTitle = "(B1-A208) Exited : Slot will be released. Thank you.";
		

		var ticketDesc = "{status} by {firstName} {lastName} on 05:00PM, 5th Jan 2017";
		ticketDesc = ticketDesc.replace("{status}", "Parked")
								.replace("{firstName}", user.firstName)
								.replace("{lastName}", user.lastName);


		var image = loc.exited;

		generic
			.addBubble(format(ticketTitle), format(ticketDesc))
			.addImage(image)
			.addButton('Book again', '#start');

		return generic.get();
	}
	else{
		return "Something went wrong, please try again."
	}
}

module.exports = {
  book(user) {
    return book(user);
  },
  qrcode(user, ticketId) {
    return qrcode(user, ticketId);
  },
  park(user){
  	return park(user);
  },
  exit(user){
  	return exit(user);
  },
  show(user) {
    return book(user);
  }
}