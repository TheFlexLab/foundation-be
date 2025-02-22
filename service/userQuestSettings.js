const UserQuestSetting = require("../models/UserQuestSetting");

const isLinkValid = async (sharedLinkOnly) => {
    try {
        const linkExistAndEnable = await UserQuestSetting.findOne(
            {
                link: sharedLinkOnly,
                linkStatus: "Enable",
            }
        );
        return linkExistAndEnable ? true : false;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    isLinkValid,
}
