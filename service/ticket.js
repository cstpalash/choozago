var botBuilder = require('claudia-bot-builder'),
    fbTemplate = botBuilder.fbTemplate;
var format = text => (text && text.substring(0, 80));
var _ = require('lodash');
var location = require('./location');
var moment = require('moment');
var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var ticketTableName = "choozago.ticket";

function book(user){
	const generic = new fbTemplate.Generic();

	var loc = _.find(location.getLocations(user.company), function(l) { return l.code == user.location; });
	if(loc){
		var ticketTitle = "(B1-A208) Expires : 10:15AM, 5th Jan 2017";
		

		var ticketDesc = "{status} by {firstName} {lastName} on 08:15AM, 5th Jan 2017";
		ticketDesc = ticketDesc.replace("{status}", "Booked")
								.replace("{firstName}", user.firstName)
								.replace("{lastName}", user.lastName);


		var image = loc.booked;

		generic
			.addBubble(format(ticketTitle), format(ticketDesc))
			.addImage(image)
			.addButton('Park my vehicle', '#park')
	    	.addButton('Cancel ticket', '#cancel');

		return generic.get();
	}
	else{
		return "Something went wrong, please try again."
	}
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
  show(user) {
    return book(user);
  },
  park(user){
  	return park(user);
  },
  exit(user){
  	return exit(user);
  }
}