var botBuilder = require('claudia-bot-builder');

var input = require('./service/input');
var registration = require('./service/registration');
var template = require('./service/template');
var ticket = require('./service/ticket');

module.exports = botBuilder(function (request, apiReq) {

	apiReq.lambdaContext.callbackWaitsForEmptyEventLoop = false;

	var parsedInput = input.parseInput(request);

  	return registration.getUserDetails(parsedInput.userid).then(function(user){
  		if(user){
  			if(!user.active){
  				return "Your account is deactivated. Please contact your local transport helpdesk."
  			}
  			else if(!user.isEmailVerified){
  				if(!isNaN(parsedInput.verificationCode)){
  					//verification code is entered
  					if(user.emailVerificationCode == parsedInput.verificationCode){
  						//email verified
  						return registration.emailVerificationDone(user).then(function(response){
                return template.getAllLocations(user.company);
  						});
  					}
  					else{
  						return "Verification code didn't match. Try again or type OFFICIAL EMAIL ADDRESS to resend verification code.";
  					}
  				}
  				else {
  					return askEmailOrSendVerificationCode(parsedInput); 
  				}
  			}
  			else{
          if(parsedInput.command){
            switch(parsedInput.command.type){
              case "addlocation":
                user.location = parsedInput.command.data.location;
                return registration.updateUser(user).then(function(updatedUser){
                  return template.getGeneric(user.company, user.location);
                });
                break;
              case "changelocation":
                return template.getAllLocations(user.company);
                break;
              case "book":
                return ticket.book(user);
                break;
              case "qrcode":
                return ticket.qrcode(user, parsedInput.command.data.ticketId);
                break;
              case "show":
                return ticket.show(user);
                break;
              case "exit":
                return ticket.exit(user, parsedInput.command.data.ticketId);
                break;
              default:
                return template.getGeneric(user.company, user.location);
                break;
            }
          }
  				else return template.getGeneric(user.company, user.location);
  			}
  		}
  		else{
  			return askEmailOrSendVerificationCode(parsedInput);
  		}
  	});
});

function askEmailOrSendVerificationCode(parsedInput){
	if(parsedInput.isEmail && parsedInput.isValidDomain){
			return registration.addUserDetails(parsedInput.userid, 
				parsedInput.payload,
				parsedInput.company.companyCode, 
				parsedInput.time).then(function(addedUser){

					return "Please check your email for verification code and type below."
				});
	}
	else if(parsedInput.isEmail && !parsedInput.isValidDomain){
		return "Sorry! Your email domain is not supported. Please try again."
	}
	else if(!parsedInput.isEmail){
		return "Please register by typing your OFFICIAL EMAIL ADDRESS. We shall send 'verification code' for authorization purpose. This is one time activity.";
	}
}