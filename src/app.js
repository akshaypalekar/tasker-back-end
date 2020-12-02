const Dynamo = require("./databaseManager");
const Responses = require("./apiResponses");
const LambdaUtils = require("./LambdaUtils");

const GSI1_NAME = process.env.GSI1_NAME;
const GSI2_NAME = process.env.GSI2_NAME;

/**
 * @param {{ httpMethod: any; }} event
 * @param {any} context
 */
exports.lambdaHandler = async (event, context) => {
    console.info(`Request received: ${event.httpMethod}`);

    switch (event.httpMethod) {
        case "POST":
            return saveItem(event, context);
        case "GET":
            return getItem(event);
        case "DELETE":
            return deleteItem(event);
        default:
            return Responses._400(`Unsupported method "${event.httpMethod}"`);
    }
};

//Function to save items to the DynamoDB table
/**
 * @param {{ httpMethod?: any; body?: any; }} event
 * @param {{ awsRequestId: any; }} context
 */
async function saveItem(event, context) {
    console.info(`saveItem function called with data: ${event.body}`);

    const body = JSON.parse(event.body);
    const uuid = context.awsRequestId;

    //Add PK and SK to the item
    const item = LambdaUtils._createRecordToSave(body, uuid);
    console.log(`Item passed to DynamoDB: ${JSON.stringify(item)}`);

    const databaseResponse = await Dynamo._save(item).catch((err) => {
        console.error(`Item not added. Error JSON: ${err}`);
        return Responses._400(`Item not added. Error JSON: ${err}`);
    });

    //Remove PK and SK from the item
    const response = LambdaUtils._cleanUpResults(
        [databaseResponse],
        item.ItemType
    );
    console.log(`Response: ${JSON.stringify(response[0])}`);
    return Responses._200(response[0]);
}

/**
 * @param {{ httpMethod?: any; pathParameters?: any; queryStringParameters?: any; }} event
 */
async function getItem(event) {
    console.info(`getItem function called`);

    let databaseResponse, response;
    const userId = event.pathParameters.userId;
    const listId = event.queryStringParameters.listId;
    const itemType = event.queryStringParameters.itemType;

    //Get all the lists belonging to a user
    if (itemType == "list") {
        console.info(`Get lists for the user`);
        databaseResponse = await Dynamo._get("PK", "USER#" + userId, "SK", "LIST#", "").catch((err) => {
            console.error(`Unable to get the users lists. Error JSON: ${err}`);
            return Responses._400(`Unable to get the users lists. Error JSON: ${err}`);
        });
    }

    //Get tasks belonging to a particular list
    if (itemType == "task" && listId) {
        console.info(`Get tasks for the particular lists`);
        databaseResponse = await Dynamo._get("SK", "LIST#" + listId, "PK", "TASK#", GSI1_NAME).catch((err) => {
            console.error(`Unable to get tasks for list. Error JSON: ${err}`);
            return Responses._400(`Unable to get tasks for list. Error JSON: ${err}`);
        });
    }

    //Get all tasks belonging to a user
    if (itemType == "task" && !listId) {
        console.info(`Get all tasks for the particular user`);
        databaseResponse = await Dynamo._get("CreatedBy", userId, "PK", "TASK", GSI2_NAME).catch((err) => {
            console.error(
                `Unable to get all tasks for user: ${userId}. Error JSON: ${err}`
            );
            return Responses._400(
                `Unable to get all tasks for user: ${userId}. Error JSON: ${err}`
            );
        });
    }

    response = LambdaUtils._cleanUpResults(databaseResponse, itemType.toUpperCase());
    console.log(`response from getItems ${response}`);
    return Responses._200(response);
}

/**
 * @param {{ httpMethod?: any; pathParameters?: any; queryStringParameters?: any; }} event
 */
async function deleteItem(event) {
    console.info(`deleteItem function called with data`);

    let items;
    const userId = event.pathParameters.userId;
    const itemId = event.queryStringParameters.itemId;
    const listId = event.queryStringParameters.listId;
    const itemType = event.queryStringParameters.itemType;

    if (itemType == "list") {
        console.log(`Deleting the list ${itemId}`);
        await Dynamo._delete("USER#" + userId, "LIST#" + itemId)
            .catch((err) => {
                console.error(`Item not deleted. Error JSON: ${err}`);
                return Responses._400(`Item not deleted. Error JSON: ${err}`);
            })
            .then(async () => {
                console.log(`Get tasks related to the list ${itemId}`);
                items = await Dynamo._get("SK", "LIST#" + itemId, "PK", "TASK#", GSI1_NAME).catch((err) => {
                    console.error(`Unable to get tasks for list for deletion. Error JSON: ${err}`);
                    return Responses._400(`Unable to get tasks for list for deletion. Error JSON: ${err}`);
                }).then(async () => {
                    console.log(`Delete the tasks related to that list`);
                    await items.map(async (item) => {
                        console.log(`Deleting the task: ${item.ItemID}`);
                        await Dynamo._delete("TASK#" + item.ItemID, "LIST#" + itemId).catch((err) => {
                            console.error(`Task ${item.ItemID} not deleted. Error JSON: ${err}`);
                            return Responses._400(`Item not deleted. Error JSON: ${err}`);
                        });
                    });
                });;
            });

    }

    if (itemType == "task") {
        await Dynamo._delete("TASK#" + itemId, "LIST#" + listId).catch((err) => {
            console.error(`Item not deleted. Error JSON: ${err}`);
            return Responses._400(`Item not deleted. Error JSON: ${err}`);
        });
    }

    console.log(`Response: ${itemType} deleted successfully`);
    return Responses._200(`${itemType} deleted successfully`);
}
