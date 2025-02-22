

/**
 * Service to compute the result from a StartQuest document.
 * @param {Object} startQuest - The StartQuest document.
 * @returns {Object} result - The computed result object.
 */
const computeResult = (startQuest) => {
    // Initialize result
    const result = {
        selected: {},
        contended: {}, // Only populated for Type 1
    };

    // Ensure `startQuest` and `data[]` exist
    if (startQuest?.data?.length > 0) {
        // Get the latest entry based on `created`
        const latestData = startQuest.data.reduce((latest, current) =>
            new Date(current.created) > new Date(latest.created) ? current : latest
        );

        // Handle Type 1 (selected and contended arrays of objects)
        if (Array.isArray(latestData.selected) && Array.isArray(latestData.contended)) {
            for (const selectedItem of latestData.selected) {
                if (selectedItem.question) {
                    result.selected[selectedItem.question] = 1;
                }
            }
            for (const contendedItem of latestData.contended) {
                if (contendedItem.question) {
                    result.contended[contendedItem.question] = 1;
                }
            }
        }

        // Handle Type 2 (selected as a string)
        else if (typeof latestData.selected === "string") {
            result.selected[latestData.selected] = 1;
        }
    }

    return result;
};

module.exports = { computeResult };
