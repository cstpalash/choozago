var botBuilder = require('claudia-bot-builder'),
    fbTemplate = botBuilder.fbTemplate;
var format = text => (text && text.substring(0, 80));
var companyLocations = require("../config/companyLocations");
var _ = require('lodash');
var location = require('./location');
var moment = require('moment');

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function getGeneric(company, locationCode){
	const generic = new fbTemplate.Generic();

  var now = moment().utcOffset("+05:30"); //Indian time NOW

	var image = "http://s3-ap-northeast-1.amazonaws.com/choozago.com/default.jpg";
	var locDesc = "unknown";
	if(companyLocations[company]){
		var loc = _.find(companyLocations[company], function(l) { return l.code == locationCode; });
		if(loc){
			image = loc.pic;
			locDesc = loc.name + " : " + now.format("h:mm a, Do MMM YYYY");
		}
	}

  var availableParking = randomIntFromInterval(1,100);

	generic
		.addBubble(format(locDesc), format("Parking available : " + availableParking))
		.addImage(image)
		.addButton('Book my ticket', '#book')
    .addButton('My last ticket', '#show')
		.addButton('Change location', '#changelocation');

	return generic.get();
}

function getAllLocations(company){
	console.log("getAllLocations");
	var allLocations = location.getLocations(company);

    var qr = [];
    allLocations.map(function(item, i){
      qr.push({
        "content_type":"text",
        "title":item.name,
        "payload":"#addlocation|" + item.code
      });
    });

    return {
      "text":"Please choose your base location from below. You can change it later.",
      "quick_replies":qr
    };
}

module.exports = {
  getGeneric(company, locationCode) {
    return getGeneric(company, locationCode);
  },
  getAllLocations(company){
  	return getAllLocations(company);
  }
}