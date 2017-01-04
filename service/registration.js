'use strict'

var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var userTableName = "choozago.user";

var email = require('./email');
var profile = require('./profile');

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function getUserDetails(userid){
	var params = {};
    params.TableName = userTableName;
    params.Key = {userid : userid};

    return dynamo.getItemAsync(params).then(function(data){
    	return data.Item;
    });
}

function updateUser(userData){
	var params = {};
    params.TableName = userTableName;
    params.Item = userData;

    return dynamo.putItemAsync(params).then(function(data){
    	return data;
    });
}

function emailVerificationDone(userData){
  userData.isEmailVerified = true;
  var params = {};
    params.TableName = userTableName;
    params.Item = userData;

    return dynamo.putItemAsync(params).then(function(data){
      return data;
    });
}

function addUserDetails(userid, officeEmail, company, time){

  return profile.getProfile(userid).then(function(profileData){

    var emailVerificationCode = randomIntFromInterval(1000, 9999);

    var userData = {
      userid : userid,
      time : time,
      officeEmail : officeEmail,
      company : company,
      active : true,
      isEmailVerified : false,
      emailVerificationCode : emailVerificationCode
    };

    if(profileData){
      if(profileData.first_name){
        userData.firstName = profileData.first_name;
      }
      if(profileData.last_name){
        userData.lastName = profileData.last_name;
      }
      if(profileData.profile_pic){
        userData.profilePic = profileData.profile_pic;
      }
      if(profileData.gender){
        userData.gender = profileData.gender;
      }
    }

    var params = {};
    params.TableName = userTableName;
    params.Item = userData;

    return dynamo.putItemAsync(params).then(function(data){   
      return email.sendVerificationCode(officeEmail, emailVerificationCode).then(function(emailResult){
        return emailResult;
      });
    });

  });

	
}

module.exports = {
  getUserDetails (userid) {
    return getUserDetails(userid);
  },
  addUserDetails(userid, officeEmail, company, time){
  	return addUserDetails(userid, officeEmail, company, time);
  },
  updateUser(userData){
  	return updateUser(userData);
  },
  emailVerificationDone(userData){
    return emailVerificationDone(userData);
  }
}