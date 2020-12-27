const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const util = require('util');
const LambdaUtils = require("./LambdaUtils");

const jwtOptions = {
    audience: "https://tddowj8otk.execute-api.us-east-1.amazonaws.com/dev",
    issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FBce5QEQc"
};

const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10, // Default value
    jwksUri: 'https://taskerdomain.auth.us-east-1.amazoncognito.com/.well-known/jwks.json'
});

exports.lambdaHandler = async (event) => {
    const token = LambdaUtils._getToken(event);

    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const getSigningKey = util.promisify(client.getSigningKey);

    return getSigningKey(decoded.header.kid)
        .then((key) => {
            const signingKey = key.getPublicKey();
            return jwt.verify(token, signingKey, jwtOptions);
        })
        .then((decoded) => ({
            principalId: decoded.sub,
            policyDocument: LambdaUtils._buildIAMPolicy('Allow', event.methodArn),
            context: { scope: decoded.scope }
        }));

};