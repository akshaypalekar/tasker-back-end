const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

const Dynamo = {
  _save: async (item) => {
    const params = {
      TableName: TABLE_NAME,
      Item: item,
    };

    const res = await docClient.put(params).promise();

    if (!res) {
      throw Error(`There was an error inserting item: ${item} in table`);
    }

    return item;
  },

  _get: async (pkey, pValue, sKey, sValue, index) => {
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

    const res = await docClient.query(params).promise();

    return res.Items || [];
  },

  _delete: async (pValue, sValue) => {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: pValue,
        SK: sValue,
      },
    };

    const res = await docClient.delete(params).promise();
  },
};

module.exports = Dynamo;
