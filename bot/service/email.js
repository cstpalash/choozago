'use strict'

var Promise = require('bluebird');
var AWS = require("aws-sdk");

var ses = Promise.promisifyAll(new AWS.SES({region: 'us-east-1'}));

function sendEmail(from, to, subject, body){
	var params = {
	  Destination: {
	    ToAddresses: to
	  },
	  Message: {
	    Body: {
	      Text: {
	        Data: body
	      }
	    },
	    Subject: {
	      Data: subject
	    }
	  },
	  Source: from
	};

	return ses.sendEmailAsync(params).then(function(data){
		return data;
	});
}

function sendVerificationCode(officeEmail, emailVerificationCode){
	var emailFrom = "noreply@choozago.com";
	var emailTo = [];
	emailTo.push(officeEmail);
	var subject = "Choozago registration success";
	var body = "Your verification code is : " + emailVerificationCode + ". Please type this in Choozago messenger app.";

	return sendEmail(emailFrom, emailTo, subject, body).then(function(data){
		return data;
	});
}

module.exports = {
  sendEmail (from, to, subject, body) {
    return sendEmail(from, to, subject, body);
  },
  sendVerificationCode(officeEmail, emailVerificationCode){
  	return sendVerificationCode(officeEmail, emailVerificationCode);
  }
}