/**
 * @file This script is the main entry point for the Indian History Timeline SPA.
 * @author [Your Name/Team]
 * @version 2.1.0
 */
import * as state from './js/state.js';
import { fetchData, buildSearchIndex } from './js/data.js';
import * as ui from './js/ui.js';
import * as speech from './js/speech.js';

/**
 * Main function to initialize the app.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader-overlay');
    const mainContent = document.getElementById('main-content');

    // 1. Fetch data and update state
    await fetchData();

    // 2. Populate initial UI text from the data store
    document.getElementById('subtitle').textContent = state.dataStore.part.subtitle;
    document.getElementById('search-bar').placeholder = state.dataStore.part.searchPlaceholder;

    // 3. Render the initial view and prepare search
    ui.renderTimelineSelection();
    buildSearchIndex();
    ui.updateBreadcrumbs();

    // 4. Set up global event listeners
    setupEventListeners();

    // 5. Hide loader and show content
    loader.classList.add('hidden');
    mainContent.classList.remove('hidden');
});

/**
 * Sets up the main event listeners for the application using event delegation.
 */
function setupEventListeners() {
    const body = document.body;

    // Central click handler
    body.addEventListener('click', (event) => {
        const target = event.target;

        // --- Navigation ---
        const timelineCard = target.closest('.timeline-card');
        if (timelineCard) { ui.handleTimelineCardClick(timelineCard); return; }

        const breadcrumbItem = target.closest('.breadcrumb-item');
        if (breadcrumbItem) { ui.handleBreadcrumbClick(breadcrumbItem); return; }

        const searchResult = target.closest('.search-result-item');
        if (searchResult) { ui.handleSearchResultClick(searchResult); return; }

        const timelineBlock = target.closest('.timeline-block');
        if (timelineBlock) { ui.handleTimelineBlockClick(timelineBlock); return; }

        const connectionTag = target.closest('.connection-tag');
        if (connectionTag) { ui.handleConnectionTagClick(connectionTag); return; }

        // --- Glossary ---
        const keyTermButton = target.closest('button.key-term');
        if (keyTermButton) { ui.handleKeyTermClick(keyTermButton); return; }

        const closeButton = target.closest('.glossary-popover-close');
        if (closeButton) { ui.handleGlossaryClose(closeButton); return; }

        const langToggle = target.closest('.language-toggle');
        if (langToggle) { ui.handleLanguageToggle(langToggle); return; }

        const learnMoreBtn = target.closest('.glossary-learn-more');
        if (learnMoreBtn) { ui.handleGlossaryLearnMore(learnMoreBtn); return; }
        
        // --- Speech ---
        const readAloudButton = target.closest('.read-aloud-btn');
        if (readAloudButton) {
            event.stopPropagation(); // Stop click from toggling <details>
            speech.handleReadAloud(readAloudButton);
            return;
        }

        // --- Popover dismissal ---
        if (!target.closest('.glossary-popover') && !target.closest('button.key-term')) {
            ui.dismissGlossaryPopover();
        }
    });

    // Accordion toggle handler
    body.addEventListener('toggle', (event) => {
        if (event.target.tagName === 'DETAILS') {
            ui.handleAccordionToggle(event.target);
        }
    }, true); // Use capture phase

    // Search bar handler with debounce
    let searchTimeout;
    document.getElementById('search-bar').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            ui.performSearch(e.target.value);
        }, 300); // 300ms debounce
    });
}