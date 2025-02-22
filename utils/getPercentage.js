const UserQuestSetting = require("../models/UserQuestSetting");

const getPercentage = (document, page, quest) => {
  let result;
  let totalStartQuest;

  if (page === "SharedLink") {
    result = quest?.result;
    totalStartQuest = quest?.questsCompleted;
  } else {
    result = document?.result;
    totalStartQuest = document?.totalStartQuest;
  }

  if (document.whichTypeQuestion === "ranked choise" && result) {
    const totalOptionCount = Object.values(result[0].selected).reduce(
      (acc, value) => acc + value,
      0
    );
    const selectedPercentage = result?.map((item) => {
      const selectedKeys = Object.keys(item?.selected);
      const totalSelected = selectedKeys.reduce(
        (sum, key) => sum + item.selected[key],
        0
      );
      const percentageObject = {};
      selectedKeys.forEach((key) => {
        percentageObject[key] =
          ((item.selected[key] / totalOptionCount) * 100).toFixed(0) + "%";
      });
      return percentageObject;
    });

    let contendedPercentage;
    if (document.whichTypeQuestion === "ranked choise") {
      contendedPercentage = result?.map((item) => {
        if (!item?.contended) return;
        const contendedKeys = Object.keys(item?.contended);
        const totalSelected = contendedKeys.reduce(
          (sum, key) => sum + item.contended[key],
          0
        );
        const percentageObject = {};

        contendedKeys.forEach((key) => {
          percentageObject[key] =
            ((item.contended[key] / totalStartQuest) * 100).toFixed(0) + "%";
        });

        return percentageObject;
      });
    }
    return { ...document, selectedPercentage, contendedPercentage };
  } else {
    const selectedPercentage = result?.map((item) => {
      const selectedKeys = Object.keys(item?.selected);
      const totalSelected = selectedKeys.reduce(
        (sum, key) => sum + item.selected[key],
        0
      );
      const percentageObject = {};

      selectedKeys.forEach((key) => {
        percentageObject[key] =
          ((item.selected[key] / totalStartQuest) * 100).toFixed(0) + "%";
      });

      return percentageObject;
    });
    let contendedPercentage;
    if (
      document.whichTypeQuestion === "multiple choise" ||
      document.whichTypeQuestion === "open choice"
    ) {
      contendedPercentage = result?.map((item) => {
        if (!item?.contended) return;
        const contendedKeys = Object.keys(item?.contended);
        const totalSelected = contendedKeys.reduce(
          (sum, key) => sum + item.contended[key],
          0
        );
        const percentageObject = {};

        contendedKeys.forEach((key) => {
          percentageObject[key] =
            ((item.contended[key] / totalStartQuest) * 100).toFixed(0) + "%";
        });

        return percentageObject;
      });
    }

    return { ...document, selectedPercentage, contendedPercentage };
  }
};

const getPercentageAA = (document, page, quest, hiddenOptionsArray, sharedLinkOnly) => {
  let result;
  let totalStartQuest;

  if (page === "SharedLink") {
    result = quest?.result;
    totalStartQuest = quest?.questsCompleted;
  } else {
    result = document?.result;
    if (sharedLinkOnly && sharedLinkOnly !== "") {
      totalStartQuest = document?.shareLinkTotalStartQuest;
    }
    else {
      totalStartQuest = document?.totalStartQuest;
    }
  }

  if (document.whichTypeQuestion === "ranked choise" && result) {
    const totalOptionCount = Object.entries(result[0].selected)
      .filter(([key]) => !hiddenOptionsArray.includes(key))
      .reduce((acc, [key, value]) => acc + value, 0);

    const selectedPercentage = result?.map((item) => {
      const selectedKeys = Object.keys(item?.selected);
      const totalSelected = selectedKeys.reduce(
        (sum, key) => sum + item.selected[key],
        0
      );
      const percentageObject = {};
      selectedKeys.forEach((key) => {
        if (!hiddenOptionsArray.includes(key)) {
          percentageObject[key] =
            ((item.selected[key] / totalOptionCount) * 100).toFixed(0) + "%";
        }
      });
      return percentageObject;
    });

    let contendedPercentage;
    if (document.whichTypeQuestion === "ranked choise") {
      contendedPercentage = result?.map((item) => {
        if (!item?.contended) return;
        const contendedKeys = Object.keys(item?.contended);
        const totalContended = contendedKeys
          .filter(([key]) => !hiddenOptionsArray.includes(key))
          .reduce((sum, key) => sum + item.contended[key], 0);

        const percentageObject = {};

        contendedKeys.forEach((key) => {
          if (!hiddenOptionsArray.includes(key)) {
            percentageObject[key] =
              ((item.contended[key] / totalContended) * 100).toFixed(0) + "%";
          }
        });

        return percentageObject;
      });
    }
    return { ...document, selectedPercentage, contendedPercentage };
  } else {
    const selectedPercentage = result?.map((item) => {
      const selectedKeys = Object.keys(item?.selected).filter(key => !hiddenOptionsArray.includes(key));;
      const totalSelected = selectedKeys
        .reduce((sum, key) => sum + item.selected[key], 0);
      const percentageObject = {};

      selectedKeys.forEach((key) => {
        if (!hiddenOptionsArray.includes(key)) {
          percentageObject[key] =
            ((item.selected[key] / totalSelected) * 100).toFixed(0) + "%";
        }
      });

      return percentageObject;
    });
    let contendedPercentage;
    if (
      document.whichTypeQuestion === "multiple choise" ||
      document.whichTypeQuestion === "open choice"
    ) {
      contendedPercentage = result?.map((item) => {
        if (!item?.contended) return;
        const contendedKeys = Object.keys(item?.contended).filter(key => !hiddenOptionsArray.includes(key));;
        const totalContended = contendedKeys
          .reduce((sum, key) => sum + item.contended[key], 0);
        const percentageObject = {};

        contendedKeys.forEach((key) => {
          if (!hiddenOptionsArray.includes(key)) {
            percentageObject[key] =
              ((item.contended[key] / totalContended) * 100).toFixed(0) + "%";
          }
        });

        return percentageObject;
      });
    }

    return { ...document, selectedPercentage, contendedPercentage };
  }
};

const getPercentageQuestForeignKey = (document, quest) => {
  let result;
  let totalStartQuest;

  // if (page === "SharedLink") {
  //   result = quest?.result;
  //   totalStartQuest = quest?.questsCompleted;
  // } else {
  result = document?.result;
  totalStartQuest = document?.totalStartQuest;
  // }

  if (document.whichTypeQuestion === "ranked choise" && result) {
    const totalOptionCount = Object.values(result[0].selected).reduce(
      (acc, value) => acc + value,
      0
    );
    const selectedPercentage = result?.map((item) => {
      const selectedKeys = Object.keys(item?.selected);
      const totalSelected = selectedKeys.reduce(
        (sum, key) => sum + item.selected[key],
        0
      );
      const percentageObject = {};
      selectedKeys.forEach((key) => {
        percentageObject[key] =
          ((item.selected[key] / totalOptionCount) * 100).toFixed(0) + "%";
      });
      return percentageObject;
    });

    let contendedPercentage;
    if (document.whichTypeQuestion === "ranked choise") {
      contendedPercentage = result?.map((item) => {
        if (!item?.contended) return;
        const contendedKeys = Object.keys(item?.contended);
        const totalSelected = contendedKeys.reduce(
          (sum, key) => sum + item.contended[key],
          0
        );
        const percentageObject = {};

        contendedKeys.forEach((key) => {
          percentageObject[key] =
            ((item.contended[key] / totalStartQuest) * 100).toFixed(0) + "%";
        });

        return percentageObject;
      });
    }
    return { ...document, selectedPercentage, contendedPercentage };
  } else {
    const selectedPercentage = result?.map((item) => {
      const selectedKeys = Object.keys(item?.selected);
      const totalSelected = selectedKeys.reduce(
        (sum, key) => sum + item.selected[key],
        0
      );
      const percentageObject = {};

      selectedKeys.forEach((key) => {
        percentageObject[key] =
          ((item.selected[key] / totalStartQuest) * 100).toFixed(0) + "%";
      });

      return percentageObject;
    });
    let contendedPercentage;
    if (
      document.whichTypeQuestion === "multiple choise" ||
      document.whichTypeQuestion === "open choice"
    ) {
      contendedPercentage = result?.map((item) => {
        if (!item?.contended) return;
        const contendedKeys = Object.keys(item?.contended);
        const totalSelected = contendedKeys.reduce(
          (sum, key) => sum + item.contended[key],
          0
        );
        const percentageObject = {};

        contendedKeys.forEach((key) => {
          percentageObject[key] =
            ((item.contended[key] / totalStartQuest) * 100).toFixed(0) + "%";
        });

        return percentageObject;
      });
    }

    return { ...document, selectedPercentage, contendedPercentage };
  }
};

module.exports = {
  getPercentage,
  getPercentageQuestForeignKey,
  getPercentageAA,
};
