const Dynamo = require("./databaseManager");
const Responses = require("./apiResponses");
const LambdaUtils = require("./LambdaUtils");

const GSI1_NAME = process.env.GSI1_NAME;
const GSI2_NAME = process.env.GSI2_NAME;

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
            return saveItem(event);
        default:
            return Responses._400(`Unsupported method "${event.httpMethod}"`);
    }
};

//Function to save items to the DynamoDB table
async function saveItem(event, context) {
    console.info(`saveItem function called with data: ${event.body}`);

    let action = 'update';
    const body = JSON.parse(event.body);

    if (event.httpMethod == "POST") {
        body.ItemID = context.awsRequestId;
        action = 'insert';
    }

    //Add PK and SK to the item
    const item = LambdaUtils._createRecordToSave(body);
    console.log(`Item passed to DynamoDB: ${JSON.stringify(item)}`);

    const databaseResponse = await Dynamo._save(item, action).catch((err) => {
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
    const listId = event.queryStringParameters.listId;
    const itemType = event.queryStringParameters.itemType;

    //Get all the lists belonging to a user
    if (itemType == "list") {
        console.info(`Get lists for the user`);
        databaseResponse = await Dynamo._get("PK", "USER#" + userId, "SK", "LIST#", "").catch((err) => {
            console.error(`Unable to get the users lists. Error JSON: ${err}`);
            return null;
        });
    }

    //Get tasks belonging to a particular list
    if (itemType == "task" && listId) {
        console.info(`Get tasks for the particular lists`);
        databaseResponse = await Dynamo._get("SK", "LIST#" + listId, "PK", "TASK#", GSI1_NAME).catch((err) => {
            console.error(`Unable to get tasks for list. Error JSON: ${err}`);
            return null;
        });
    }

    //Get all tasks belonging to a user
    if (itemType == "task" && !listId) {
        console.info(`Get all tasks for the particular user`);
        databaseResponse = await Dynamo._get("CreatedBy", userId, "PK", "TASK", GSI2_NAME).catch((err) => {
            console.error(`Unable to get all tasks for user: ${userId}. Error JSON: ${err}`);
            return null;
        });
    }

    response = LambdaUtils._cleanUpResults(databaseResponse, itemType.toUpperCase());
    console.log(`response from getItems ${response}`);
    return Responses._200(response);
}

async function deleteItem(event) {
    console.info(`deleteItem function called with data`);

    const userId = event.pathParameters.userId;
    const itemId = event.queryStringParameters.itemId;
    const listId = event.queryStringParameters.listId;
    const itemType = event.queryStringParameters.itemType;

    if (itemType == "list") {
        console.log(`Deleting the list ${itemId}`);
        await Dynamo._delete("USER#" + userId, "LIST#" + itemId).catch((err) => {
            console.error(`Item not deleted. Error JSON: ${err}`);
            return null;
        })

        console.log(`Getting tasks related to the list: ${itemId}`);
        await Dynamo._get("SK", "LIST#" + itemId, "PK", "TASK#", GSI1_NAME)
            .then(async (items) => {
                return Promise.all(items.map(async (item) => {
                    console.info(`Archiving task: ${item.ItemID}`);
                    item.isArchived = true;
                    await Dynamo._update(item).catch((err) => {
                        console.error(`Task ${item.ItemID} not archived. Error JSON: ${err}`);
                        return null;
                    });
                }));
            })
            .catch((err) => {
                console.error(`Unable to get tasks for list for deletion. Error JSON: ${err}`);
                return null;
            })
    }

    if (itemType == "task") {
        await Dynamo._delete("TASK#" + itemId, "LIST#" + listId).catch((err) => {
            console.error(`Item not deleted. Error JSON: ${err}`);
            return null;
        });
    }

    console.log(`Response: ${itemType} deleted successfully`);
    return Responses._200(`${itemType} deleted successfully`);
}
