'use strict'

var companyLocations = require("../config/companyLocations");

function getLocations(companyCode){
	return companyLocations[companyCode] ? companyLocations[companyCode] : [];
}

module.exports = {
  getLocations(companyCode) {
    return getLocations(companyCode);
  }
}