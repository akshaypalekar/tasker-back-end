const TABLE_NAME = process.env.TABLE_NAME;
const GSI1_NAME = process.env.GSI1_NAME;
const GSI2_NAME = process.env.GSI2_NAME;

const LambdaUtils = {

  _createQueryBuilder: (item) => {
    let params = {};

    if (item.ItemType == "LIST") {
      item.PK = "USER#" + item.CreatedBy;
      item.SK = "LIST#" + item.ItemID;
    }

    if (item.ItemType == "TASK") {
      item.PK = "TASK#" + item.ItemID;
      item.SK = "LIST#" + item.ListID;
      item.TaskArchive = "TASK#" + item.isArchived;
    }

    params = {
      TableName: TABLE_NAME,
      Item: item,
    };

    return params;
  },

  _getQueryBuilder: (itemType, userId, listId, archiveFlag) => {
    let params = {}

    if (itemType == "list") {
      params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: `PK = :pValue and begins_with(SK, :sValue)`,
        ExpressionAttributeValues: {
          ":pValue": "USER#" + userId,
          ":sValue": "LIST#",
        },
      };
    }

    if (itemType == "task" && listId) {
      params = {
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: `SK = :pValue and begins_with(PK, :sValue)`,
        ExpressionAttributeValues: {
          ":pValue": "LIST#" + listId,
          ":sValue": "TASK#",
        },
      };
    }

    if (itemType == "task" && listId == "") {
      params = {
        TableName: TABLE_NAME,
        IndexName: GSI2_NAME,
        KeyConditionExpression: `CreatedBy = :pValue and begins_with(TaskArchive, :sValue)`,
        ExpressionAttributeValues: {
          ":pValue": userId,
          ":sValue": "TASK#" + archiveFlag,
        },
      };
    }

    return params;
  },

  _deleteQueryBuilder: (pValue, sValue) => {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: pValue,
        SK: sValue,
      },
    };

    return params;
  },

  _cleanUpResults: (response, itemType) => {
    if (itemType == "LIST") {
      return response.map((item) => {
        return {
          ItemType: item.ItemType,
          ItemID: item.ItemID,
          ListName: item.ListName,
          CreatedOn: item.CreatedOn,
          CreatedBy: item.CreatedBy,
          UpdatedOn: item.UpdatedOn,
          UpdatedBy: item.UpdatedBy,
        };
      });
    }

    if (itemType == "TASK") {
      return response.map((item) => {
        return {
          ItemType: item.ItemType,
          ItemID: item.ItemID,
          ListID: item.ListID,
          TaskTitle: item.TaskTitle,
          TaskDescription: item.TaskDescription,
          TaskPriority: item.TaskPriority,
          TaskDueDT: item.TaskDueDT,
          TaskStatus: item.TaskStatus,
          isComplete: item.isComplete,
          isArchived: item.isArchived,
          CreatedOn: item.CreatedOn,
          CreatedBy: item.CreatedBy,
          UpdatedOn: item.UpdatedOn,
          UpdatedBy: item.UpdatedBy,
        };
      });
    }
  },

  _buildIAMPolicy: (userId, effect, resource) => {
    const policy = {
      principalId: userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: resource,
          },
        ],
      },
    };
  
    return policy;
  }
};

module.exports = LambdaUtils;
