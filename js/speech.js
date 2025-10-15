/**
 * @file Manages the Web Speech API for text-to-speech functionality.
 */

import * as state from './state.js';

/**
 * Handles the text-to-speech functionality.
 * @param {HTMLElement} button - The read-aloud button element that was clicked.
 */
export const handleReadAloud = async (button) => {
    if (state.speechState.isSpeaking && state.speechState.currentButton === button) {
        stopSpeech();
        return;
    }

    stopSpeech(); // Stop any previous speech before starting new

    let textToRead = '';
    let lang = 'hi-IN'; // Default to Hindi

    if (button.dataset.type === 'glossary') {
        const popover = button.closest('.glossary-popover');
        if (popover) {
            textToRead = popover.querySelector('.glossary-popover-content p')?.textContent;
            // Check current language of popover to set speech lang
            if (popover.querySelector('.language-toggle')?.dataset.lang === 'hi') {
                lang = 'en-US';
            }
        }
    } else {
        // New logic for reading content from the panel adjacent to the summary header
        const summary = button.closest('summary');
        const contentPanel = summary?.nextElementSibling;

        if (contentPanel && contentPanel.classList.contains('content-panel')) {
            const contentClone = contentPanel.cloneNode(true);
            
            // IMPORTANT: Remove all nested summaries to avoid re-reading titles
            contentClone.querySelectorAll('summary').forEach(summary => summary.remove());
            
            textToRead = contentClone.textContent.trim().replace(/\s+/g, ' ');
        }
    }

    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang;

    state.setSpeechInstance(utterance);
    state.setSpeechState({ isSpeaking: true, currentButton: button });
    button.classList.add('speaking');

    utterance.onend = () => {
        stopSpeech();
    };
    
    utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        stopSpeech();
    };

    window.speechSynthesis.speak(utterance);
};

/**
 * Stops any ongoing speech and resets the UI state.
 */
export const stopSpeech = () => {
    if (state.speechState.isSpeaking || window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    if (state.speechState.currentButton) {
        state.speechState.currentButton.classList.remove('speaking');
    }
    state.setSpeechInstance(null);
    state.setSpeechState({ isSpeaking: false, currentButton: null });
};