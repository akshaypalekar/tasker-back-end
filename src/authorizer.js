const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const util = require('util');
const LambdaUtils = require("./LambdaUtils");

const jwtOptions = {
    audience: "19ul0dh7n2d7mdfdf5m6tnds9o",
    issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FBce5QEQc"
};

const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10, // Default value
    jwksUri: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FBce5QEQc/.well-known/jwks.json'
});

exports.lambdaHandler = async (event) => {
    console.log("User event: " + JSON.stringify(event));

    const token = LambdaUtils._getToken(event);

    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const getSigningKey = util.promisify(client.getSigningKey);

    return getSigningKey(decoded.header.kid)
        .then((key) => {
            const signingKey = key.getPublicKey();
            console.log("User signingKey: " + JSON.stringify(signingKey));
            return jwt.verify(token, signingKey, jwtOptions);
        })
        .then((decoded) => ({
            principalId: decoded.sub,
            policyDocument: LambdaUtils._buildIAMPolicy('Allow', event.methodArn)
        }));

};