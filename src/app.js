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

async function getItem(event) {
  console.info(`getItem function called with data: "${event.body}"`);

  let databaseResponse, response;
  const userId = event.pathParameters.userId;
  //const listId = event.queryStringParameters.listId;
  const itemType = event.queryStringParameters.itemType;

  //Get all the lists belonging to a user
  if (itemType == "list") {
    databaseResponse = await Dynamo._get("PK", "USER#" + userId, "SK", "LIST#").catch((err) => {
      console.error(`Unable to get the users lists. Error JSON: ${err}`);
      return Responses._400(`Unable to get the users lists. Error JSON: ${err}`);
    });

    response = LambdaUtils._cleanUpResults(databaseResponse, 'LIST');
    console.log(`response from getItems ${JSON.stringify(response)}`);
    return Responses._200(response);
  }
}
