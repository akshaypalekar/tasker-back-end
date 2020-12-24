const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-client');
const util = require('util');
const LambdaUtils = require("./LambdaUtils");

const jwtOptions = {
    audience: "19ul0dh7n2d7mdfdf5m6tnds9o",
    issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FBce5QEQc"
};

exports.lambdaHandler = async (event) => {
    const token = LambdaUtils._getToken(event);

    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const client = jwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10, // Default value
        jwksUri: 'https://taskerdomain/.well-known/jwks.json'
    });

    const getSigningKey = util.promisify(client.getSigningKey);

    return getSigningKey(decoded.header.kid)
        .then((key) => {
            const signingKey = key.publicKey || key.rsaPublicKey;
            return jwt.verify(token, signingKey, jwtOptions);
        })
        .then((decoded) => ({
            principalId: decoded.sub,
            policyDocument: LambdaUtils._buildIAMPolicy('Allow', event.methodArn),
            context: { scope: decoded.scope }
        }));

};