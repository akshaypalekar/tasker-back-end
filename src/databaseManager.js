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
      throw Error(`There was an error inserting item:  ${item} in table`);
    }

    return item;
  },
};

module.exports = Dynamo;
