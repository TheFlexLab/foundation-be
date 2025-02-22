const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const UserQuestSetting = require("../models/UserQuestSetting");


// This middleware function will be called for every incoming request
const isUrlSharedPostValidToInteract = async (req, res, next) => {
    try {
        if (req.body && req.body.selection && req.body.link) {

            const { link } = req.body;

            const quest = await UserQuestSetting.findOne({ link: link });

            if(!quest) throw new Error("Wrong link");

            const infoQuestQuestion = await InfoQuestQuestions.findOne(
                {
                    _id: quest.questForeignKey
                }
            )

            if (!infoQuestQuestion) {
                return res.status(404).send(
                    {
                        message: "Sorry, this post has been deleted by the user who created it.",
                        _id: questForeignKeyValue
                    }
                );
            }

            // Call next() to pass control to the next middleware function
            next();
        }
        else {
            // Check if questForeignKey exists in any of req.params, req.query, or req.body
            const { params, query, body } = req;
            const keys = ['questForeignKey'];

            let questForeignKeyValue = null;

            keys.some(key => {
                if (params && params.hasOwnProperty(key)) {
                    questForeignKeyValue = params[key];
                    return true;
                }
                if (query && query.hasOwnProperty(key)) {
                    questForeignKeyValue = query[key];
                    return true;
                }
                if (body && body.hasOwnProperty(key)) {
                    questForeignKeyValue = body[key];
                    return true;
                }
                return false;
            });

            if (!questForeignKeyValue) {
                // If questForeignKey is not found in any of the objects, throw an error
                throw new Error('questForeignKey not found in params, query, or body');
            }

            const infoQuestQuestion = await InfoQuestQuestions.findOne(
                {
                    _id: questForeignKeyValue
                }
            )

            if (!infoQuestQuestion) {
                return res.status(404).send(
                    {
                        message: "Sorry, this post has been deleted by the user who created it.",
                        _id: questForeignKeyValue
                    }
                );
            }

            // Call next() to pass control to the next middleware function
            next();
        }
    } catch (error) {
        // If an error occurs, pass it to the error handling middleware
        res.status(500).json({message: `Internel Server Error: ${error.message}`});
    }
};

module.exports = isUrlSharedPostValidToInteract;