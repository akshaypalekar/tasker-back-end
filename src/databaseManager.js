const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

const Dynamo = {
    _save: async (params) => {

        const res = await docClient.put(params).promise();

        if (!res) {
            throw Error(`There was an error inserting the item`);
        }

        return params.Item;
    },

    _get: async (params) => {

        const data = await docClient.query(params).promise();

        if (!data || !data.Items) {
            throw Error(`There was an error fetching the data`);
        }

        return data.Items;
    },

    _delete: async (params) => {

        const res = docClient.delete(params).promise();

        if (!res) {
            throw Error(`There was an error deleting the item`);
        }
    },
};

module.exports = Dynamo;
