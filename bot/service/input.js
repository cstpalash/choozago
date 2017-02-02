'use strict'

var emailValidator = require("email-validator");
var validEmailDomains = require("../config/emailDomains");

function parseInput(request){
	console.log(request);
	var userid = request.sender;
	var time = request.originalRequest.timestamp;

	var payload = request.text;
	if(payload) 
		payload = payload.toLowerCase().trim();
	else 
		payload = "";

	var returnValue = {
		userid : userid,
		time : time,
		postback : request.postback,
		payload : payload
	};

	var isEmail = emailValidator.validate(payload);
	var isValidDomain = false;
	var company = "unknown";
	if(isEmail){
		var domain = payload.substring(payload.lastIndexOf("@") + 1);
		if(validEmailDomains[domain]){
			isValidDomain = true;
			company = validEmailDomains[domain];
		}
	}

	var vc = parseInt(payload);

	returnValue.isEmail = isEmail;
	returnValue.isValidDomain = isValidDomain;
	returnValue.company = company;
	returnValue.verificationCode = vc;

	if(request.postback && payload.startsWith("#")){
		//This is a command
		var cmd = {
			type : "unknown",
			payload : payload
		};

		if(payload.startsWith("#addlocation|")){
			cmd.type = "addlocation";
			cmd.data = { location : payload.split('|')[1] }
		}

		if(payload.startsWith("#qrcode|")){
			cmd.type = "qrcode";
			cmd.data = { ticketId : payload.split('|')[1] }
		}

		if(payload.startsWith("|")){
			cmd.type = "exit";
			cmd.data = { ticketId : payload.split('|')[1] }
		}
		
		if(payload.startsWith("#cancel|")){
			cmd.type = "cancel";
			cmd.data = { ticketId : payload.split('|')[1] }
		}

		if(payload == "#changelocation"){
			cmd.type = "changelocation";
		}

		if(payload == "#book"){
			cmd.type = "book";
		}

		if(payload == "#show"){
			cmd.type = "show";
		}

		if(payload == "#start"){
			cmd.type = "start";
		}

		returnValue.command = cmd;
	}
	console.log(returnValue);

	return returnValue;
}

module.exports = {
  parseInput (request) {
    return parseInput(request);
  }
}