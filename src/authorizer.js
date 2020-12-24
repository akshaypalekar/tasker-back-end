// const _ = require('lodash');
// const jwt = require('jsonwebtoken');
const LambdaUtils = require("./LambdaUtils");

exports.lambdaHandler = async (event) => {
    const token = event.authorizationToken.toLowerCase();
    const methodArn = event.methodArn;

    console.info(`Authorization Token: ${token}`);
    console.info(`Method Arn: ${methodArn}`);

    switch (token.toLowerCase()) {
        case 'allow':
            return LambdaUtils._buildIAMPolicy('user', 'Allow' , methodArn);
        case 'deny':
            return LambdaUtils._buildIAMPolicy('user', 'Deny' , methodArn);;
        case 'unauthorized':
            return "Unauthorized";   // Return a 401 Unauthorized response
        default:
            return "Error: Invalid token"; 
    }
};