/**
 * @file Manages the global state for the application.
 */

// Holds all fetched JSON data (timelines, glossary, etc.)
export let dataStore = {}; 
// ID of the currently displayed timeline section
export let currentTimeline = null; 
// Holds the global SpeechSynthesisUtterance instance
export let speechInstance = null; 
// Holds the state of the speech synthesis feature
export let speechState = {
    isSpeaking: false,
    currentButton: null,
};
// Holds the flattened data for searching
export let searchIndex = [];

// --- State Modifiers ---

export function setDataStore(data) {
    dataStore = data;
}

export function setCurrentTimeline(id) {
    currentTimeline = id;
}

export function setSpeechInstance(instance) {
    speechInstance = instance;
}

export function setSpeechState(newState) {
    speechState = { ...speechState, ...newState };
}

export function setSearchIndex(index) {
    searchIndex = index;
}
