const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

const Dynamo = {
    _save: (item) => {
        const params = {
            TableName: TABLE_NAME,
            Item: item,
        };

        docClient.put(params, function (err, data) {
            if (err) console.error(`There was an error inserting the item: ${err}`);
            else return item;
        });
    },

    _get : (pkey, pValue, sKey, sValue, index) => {
        let params;

        if (index !== "") {
            params = {
                TableName: TABLE_NAME,
                IndexName: index,
                KeyConditionExpression: `${pkey} = :pValue and begins_with(${sKey}, :sValue)`,
                ExpressionAttributeValues: {
                    ":pValue": pValue,
                    ":sValue": sValue,
                },
            };
        } else {
            params = {
                TableName: TABLE_NAME,
                KeyConditionExpression: `${pkey} = :pValue and begins_with(${sKey}, :sValue)`,
                ExpressionAttributeValues: {
                    ":pValue": pValue,
                    ":sValue": sValue,
                },
            };
        }

        docClient.query(params, function (err, data) {
            if (err) console.error(`There was an error getting the items: ${err}`);
            else return data.Items || [];
        });
    },

    _delete: (pValue, sValue) => {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                PK: pValue,
                SK: sValue,
            },
        };

        docClient.delete(params, function (err, data) {
            if (err) console.error(`There was an error deleting item: ${err}`);
            else return data;
        });
    },
};

module.exports = Dynamo;
