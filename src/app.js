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
        default:
            return Responses._400(`Unsupported method "${event.httpMethod}"`);
    }
};

//Function to save items to the DynamoDB table
async function saveItem(event, context) {
    console.info(`saveItem function called with data: ${event.body}`);

    const body = JSON.parse(event.body);
    const uuid = context.awsRequestId;

    //Add PK and SK to the item
    const item = LambdaUtils._createRecordToSave(body, uuid);
    console.log(`Item passed to DynamoDB: ${JSON.stringify(item)}`);

    // @ts-ignore
    const databaseResponse = Dynamo._save(item);

    //Remove PK and SK from the item
    const response = LambdaUtils._cleanUpResults([databaseResponse], item.ItemType);

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
        // @ts-ignore
        databaseResponse = Dynamo._get("PK", "USER#" + userId, "SK", "LIST#", "");

        //Get tasks belonging to a particular list
        if (itemType == "task" && listId) {
            console.info(`Get tasks for the particular lists`);
            // @ts-ignore
            databaseResponse = Dynamo._get("SK", "LIST#" + listId, "PK", "TASK#", GSI1_NAME);
        }

        //Get all tasks belonging to a user
        if (itemType == "task" && !listId) {
            console.info(`Get all tasks for the particular user`);
            // @ts-ignore
            databaseResponse = Dynamo._get("CreatedBy", userId, "PK", "TASK", GSI2_NAME);
        }

        response = LambdaUtils._cleanUpResults(databaseResponse, itemType.toUpperCase());
        console.log(`response from getItems ${response}`);
        return Responses._200(response);
    }
}

async function deleteItem(event) {
    console.info(`deleteItem function called with data`);

    let items;
    const userId = event.pathParameters.userId;
    const itemId = event.queryStringParameters.itemId;
    const listId = event.queryStringParameters.listId;
    const itemType = event.queryStringParameters.itemType;

    if (itemType == "list") {
        Dynamo._delete("USER#" + userId, "LIST#" + itemId);

        items = Dynamo._get("SK", "LIST#" + itemId, "PK", "TASK#", GSI1_NAME);

        // @ts-ignore
        items.map((item) => {
            Dynamo._delete("TASK#" + item.ItemID, "LIST#" + itemId);
        });
    }

    if (itemType == "task") {
        Dynamo._delete("TASK#" + itemId, "LIST#" + listId);
    }

    return Responses._200(`${itemType} deleted successfully`);
}

