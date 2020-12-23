const Dynamo = require("./databaseManager");
const Responses = require("./apiResponses");
const LambdaUtils = require("./LambdaUtils");

exports.lambdaHandler = async (event, context) => {
    console.info(`Request received: ${event.httpMethod}`);

    switch (event.httpMethod) {
        case "POST":
            return saveItem(event, context);
        case "GET":
            return getItem(event);
        case "DELETE":
            return deleteItem(event);
        case "PUT":
            return updateItem(event);
        default:
            return Responses._400(`Unsupported method "${event.httpMethod}"`);
    }
};

//Function to save items to the DynamoDB table
async function saveItem(event, context) {
    console.info(`saveItem function called with data: ${event.body}`);

    const body = JSON.parse(event.body);
    body.ItemID = context.awsRequestId;

    //Add PK and SK to the item
    const params = LambdaUtils._createQueryBuilder(body);

    const databaseResponse = await Dynamo._save(params).catch((err) => {
        console.error(`Item not added. Error JSON: ${err}`);
        return null;
    });

    //Remove PK and SK from the item
    const response = LambdaUtils._cleanUpResults([databaseResponse], body.ItemType);
    console.log(`Response: ${JSON.stringify(response[0])}`);
    return Responses._200(response[0]);
}

async function getItem(event) {
    console.info(`getItem function called`);

    let databaseResponse, response;
    const userId = event.pathParameters.userId;
    const listId = event.queryStringParameters.listId || "";
    const itemType = event.queryStringParameters.itemType || "";
    const archiveFlag = event.queryStringParameters.archiveFlag || "";

    const params = LambdaUtils._getQueryBuilder(itemType, userId, listId, archiveFlag);

    databaseResponse = await Dynamo._get(params).catch((err) => {
        console.error(`Unable to get items. Error JSON: ${err}`);
        return null;
    });

    response = LambdaUtils._cleanUpResults(databaseResponse, itemType.toUpperCase());
    console.log(`response from getItems ${response}`);
    return Responses._200(response);
}

async function deleteItem(event) {
    console.info(`deleteItem function called with data`);

    let deleteParams;
    const userId = event.pathParameters.userId;
    const itemId = event.queryStringParameters.itemId;
    const listId = event.queryStringParameters.listId;
    const itemType = event.queryStringParameters.itemType;

    if (itemType == "list") {
        console.log(`Deleting the list ${itemId}`);
        deleteParams = LambdaUtils._deleteQueryBuilder("USER#" + userId, "LIST#" + itemId);
        await Dynamo._delete(deleteParams).catch((err) => {
            console.error(`Item not deleted. Error JSON: ${err}`);
            return null;
        });

        const getParams = LambdaUtils._getQueryBuilder(itemType, userId, listId, "")

        console.log(`Getting tasks related to the list: ${itemId}`);
        await Dynamo._get(getParams).then(async (items) => {
                return Promise.all(items.map(async (item) => {
                    console.info(`Deleting related task: ${item.ItemID}`);
                    item.isArchived = true;
                    deleteParams = LambdaUtils._deleteQueryBuilder("TASK#" + item.ItemID, "LIST#" + itemId);
                    await Dynamo._delete(deleteParams).catch((err) => {
                        console.error(`Task ${item.ItemID} not deleted. Error JSON: ${err}`);
                        return null;
                    });
                }));
            })
            .catch((err) => {
                console.error(`Unable to get tasks for list for deletion. Error JSON: ${err}`);
                return null;
            });
    }

    if (itemType == "task") {
        deleteParams = LambdaUtils._deleteQueryBuilder("TASK#" + itemId, "LIST#" + listId);

        await Dynamo._delete(deleteParams).catch((err) => {
            console.error(`Item not deleted. Error JSON: ${err}`);
            return null;
        });
    }

    console.log(`Response: ${itemType} deleted successfully`);
    return Responses._200(`${itemType} deleted successfully`);
}

async function updateItem(event) {
    console.info(`saveItem function called with data: ${event.body}`);

    const body = JSON.parse(event.body);

    //Add PK and SK to the item
    const item = LambdaUtils._createQueryBuilder(body);
    console.log(`Item passed to DynamoDB: ${JSON.stringify(item)}`);

    const databaseResponse = await Dynamo._save(item).catch((err) => {
        console.error(`Item not added. Error JSON: ${err}`);
        return null;
    });

    //Remove PK and SK from the item
    const response = LambdaUtils._cleanUpResults([databaseResponse], body.ItemType);
    console.log(`Response: ${JSON.stringify(response[0])}`);
    return Responses._200(response[0]);
}
