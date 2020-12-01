const Dynamo = require("./databaseManager");
const Responses = require("./apiResponses");

exports.lambdaHandler = async (event) => {
  console.info(`Request received: ${event.httpMethod}`);

  switch (event.httpMethod) {
    case "POST":
      return saveItem(event);
    default:
      return Responses._400(`Unsupported method "${event.httpMethod}"`);
  }
};

//Function to save items to the DynamoDB table
async function saveItem(event) {
  console.info(`saveItem function called with data: ${event.body}`);

  const item = JSON.parse(event.body);

  const response = await Dynamo._save(item).catch((err) => {
    return Responses._400(`Item not added. Error JSON: ${err}`);
  });

  return Responses._200(response);
}