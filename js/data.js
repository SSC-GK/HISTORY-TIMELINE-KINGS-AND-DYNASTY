/**
 * @file Handles data fetching and processing.
 */

import * as state from './state.js';

/**
 * Fetches all necessary JSON data in parallel and stores it.
 * @returns {Promise<void>}
 */
export const fetchData = async () => {
    try {
        const [part, dynasty, kings, other, glossary, connections, timelineData] = await Promise.all([
            fetch('content-json/part.json').then(res => res.json()),
            fetch('content-json/dynasty.json').then(res => res.json()),
            fetch('content-json/kings.json').then(res => res.json()),
            fetch('content-json/other.json').then(res => res.json()),
            fetch('content-json/Glossary.json').then(res => res.json()),
            fetch('content-json/ConnectionsData.json').then(res => res.json()),
            fetch('content-json/TimelineData.json').then(res => res.json()),
        ]);
        state.setDataStore({ part, dynasty, kings, other, glossary, connections, timelineData });
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        // In a real app, you might want to display a user-friendly error message on the page
    }
};

/**
 * Creates a flat, searchable index from the nested data.
 */
export const buildSearchIndex = () => {
    const newSearchIndex = [];
    Object.keys(state.dataStore.dynasty).forEach(timelineId => {
        const timeline = state.dataStore.dynasty[timelineId];
        const timelinePath = timeline.title.split('(')[1]?.replace(')', '').trim() || timeline.title;

        const traverse = (item, path, parentId) => {
            const currentId = item.id || parentId;
            const currentPath = [...path, item.summary.title];

            const founderText = item.summary.founder ? `founder ${item.summary.founder}` : '';
            const capitalText = item.summary.capital ? `capital ${item.summary.capital}` : '';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content || '';
            const contentText = tempDiv.textContent || tempDiv.innerText || '';

            newSearchIndex.push({
                id: currentId,
                title: item.summary.title,
                text: `${item.summary.title} ${founderText} ${capitalText} ${contentText}`.toLowerCase(),
                path: currentPath.join(' > '),
                timelineId: timelineId
            });

            if (item.subItems) {
                item.subItems.forEach(subItemKey => {
                    if (typeof subItemKey === 'object') {
                        traverse(subItemKey, currentPath, currentId);
                    } else {
                        const subItemData = state.dataStore.kings[subItemKey] || state.dataStore.other[subItemKey];
                        if (subItemData) {
                            const fullSubItemData = { id: subItemKey, ...subItemData };
                            traverse(fullSubItemData, currentPath, currentId);
                        }
                    }
                });
            }
        };

        timeline.items.forEach(item => traverse(item, [timelinePath], item.id));
    });
    state.setSearchIndex(newSearchIndex);
};