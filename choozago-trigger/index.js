var Promise = require('bluebird');
var doc = require('dynamodb-doc');
var dynamo = Promise.promisifyAll(new doc.DynamoDB());
var moment = require('moment');
var ticketTableName = 'choozago.ticket';
var liveStatusTableName = 'choozago.status';

exports.handler = function (event, context, callback) {
    
    var allPromises = [];
    
    event.Records.forEach((record) => {
        switch (record.eventName) {
            case 'INSERT':
                allPromises.push(updateStatus(record.dynamodb.NewImage, null));
                break;
            case 'MODIFY':
                allPromises.push(updateStatus(record.dynamodb.NewImage, record.dynamodb.OldImage));
                break;
            default:
                // code
                break;
        }
    });
    
    Promise.all(allPromises).then(function(values){
        callback(null, 'Precessed : ' + values.length);
    }, function(err){
        callback(err, null);
    });
};

function updateStatus(newData, oldData){
    
    var ticketDay = moment.unix(newData.time.N).startOf('day').unix();
    
    var paramGet = {};
    paramGet.TableName = liveStatusTableName;
    paramGet.Key = {date : ticketDay, locationCode : newData.locationCode.S};
    
    return dynamo.getItemAsync(paramGet).then(function(existing){
        
        var dataToBeUpdated = existing.Item;
        
        if(dataToBeUpdated){ //status is present in database for the day when ticket booked
            if(oldData){ //update ticket
                if(dataToBeUpdated[oldData.status.S]){
                    dataToBeUpdated[oldData.status.S] -= 1;
                }
                else{
                    dataToBeUpdated[oldData.status.S] = 0;
                }
                
                if(dataToBeUpdated[newData.status.S]){
                    dataToBeUpdated[newData.status.S] += 1;
                }
                else{
                    dataToBeUpdated[newData.status.S] = 1;
                }
            }
            else{ //add ticket
                if(dataToBeUpdated[newData.status.S]){
                    dataToBeUpdated[newData.status.S] += 1;
                }
                else{
                    dataToBeUpdated[newData.status.S] = 1;
                }
            }
        }
        else{ //status is NOT present in database for the day when ticket booked
            dataToBeUpdated = {date : ticketDay, locationCode : newData.locationCode.S, company : newData.company.S};
            
            dataToBeUpdated[newData.status.S] = 1;
        }
        
        var paramPut = {};
        paramPut.TableName = liveStatusTableName;
        paramPut.Item = dataToBeUpdated;
        return dynamo.putItemAsync(paramPut).then(function(dataDb){
    	    return dataToBeUpdated;
        });
    });
}