const LambdaUtils = {
  _createRecordToSave: (item, uuid) => {
    item.ItemID = uuid;

    if (item.ItemType == "LIST") {
      item.PK = "USER#" + item.CreatedBy;
      item.SK = "LIST#" + item.ItemID;
    }

    if (item.ItemType == "TASK") {
      item.PK = "TASK#" + item.ItemID;
      item.SK = "LIST#" + item.ListID;
    }
    return item;
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
};

module.exports = LambdaUtils;
