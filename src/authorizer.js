// const _ = require('lodash');
// const jwt = require('jsonwebtoken');
const LambdaUtils = require("./LambdaUtils");

exports.lambdaHandler = async (event, context) => {
    const token = event.authorizationToken.toLowerCase();
    const methodArn = event.methodArn;

    console.info(`Authorization Token: ${token}`);
    console.info(`Method Arn: ${methodArn}`);

    
    const policyDocument = LambdaUtils._buildIAMPolicy('user', 'Allow' , methodArn);
    
    return policyDocument;
};