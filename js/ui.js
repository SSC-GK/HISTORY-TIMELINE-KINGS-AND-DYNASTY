/**
 * @file Handles all DOM rendering, manipulation, and UI-related event logic.
 */

import * as state from './state.js';
import { stopSpeech } from './speech.js';

// --- [RENDERING LOGIC] ---

/**
 * Creates and populates the main timeline selection cards.
 */
export const renderTimelineSelection = () => {
    const container = document.getElementById('timeline-selection');
    const cards = state.dataStore.part.timelineCards.map(card => `
        <div class="timeline-card" data-target="${card.target}" role="button" tabindex="0" aria-label="Select timeline: ${card.subtitle}">
            <span class="timeline-title">${card.title}</span>
            <span class="timeline-subtitle">${card.subtitle}</span>
            <span class="timeline-period">${card.period}</span>
        </div>
    `).join('');
    container.innerHTML = cards;
};

/**
 * Creates the HTML for a single accordion item.
 * @param {object} item - The data object for the accordion item.
 * @param {number} level - The nesting level.
 * @param {number} index - The index of the item for color coding.
 * @param {number} totalItems - The total number of items at the same level.
 * @returns {string} The HTML string for the accordion item.
 */
export const createAccordionItem = (item, level, index, totalItems) => {
    const detailsId = item.id || `item-${Date.now()}-${Math.random()}`;
    let detailsClass, summaryClass, contentClass, colorClass = '';

    if (level === 0) {
        detailsClass = 'dynasty-details';
        summaryClass = 'dynasty-summary';
        contentClass = 'content-panel';
    } else {
        detailsClass = 'king-details';
        summaryClass = 'king-summary';
        contentClass = 'content-panel';
        if (item.type?.includes('king-details')) {
            colorClass = (index === totalItems - 1) ? 'king-color-last' : `king-color-${(index % 12) + 1}`;
        }
        if (item.type?.includes('invasion-type-iranian')) colorClass = 'invasion-type-iranian';
        if (item.type?.includes('invasion-type-greek')) colorClass = 'invasion-type-greek';
        if (item.type?.includes('enhanced-profile')) detailsClass += ' enhanced-profile';
    }

    const founder = item.summary.founder ? `<span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" /></svg><strong>Founder:</strong> ${item.summary.founder}</span>` : '';
    const capital = item.summary.capital ? `<span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M4 1.5a.5.5 0 0 0-.5.5v11.586l3.5-3.5 3.5 3.5V2a.5.5 0 0 0-.5-.5h-6Z" clip-rule="evenodd" /></svg><strong>Capital:</strong> ${item.summary.capital}</span>` : '';
    const dynastyMeta = (founder || capital) ? `<div class="dynasty-meta">${founder}${capital}</div>` : '';

    const summaryContent = level === 0 ? `
        <div class="summary-content-wrapper">
            <div class="summary-title-line"><span class="summary-title">${item.summary.title}</span>${item.summary.period ? `<span class="dynasty-period">${item.summary.period}</span>` : ''}</div>
            ${dynastyMeta}
        </div>` : `
        <div class="summary-content-wrapper">
            <span class="summary-title">${item.summary.title}</span>
            ${item.summary.reign ? `<span class="king-reign">${item.summary.reign}</span>` : ''}
        </div>`;

    const arrowIcon = level === 0
        ? `<svg class="arrow w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>`
        : `<span class="arrow-inner text-indigo-600" aria-hidden="true">▶</span>`;

    const readAloudButton = `<button class="read-aloud-btn" aria-label="Read ${item.summary.title} aloud"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M11.25 3.383c0-1.113-1.347-1.67-2.134-.883l-3.75 3.75H4.58c-.95 0-1.93.553-2.216 1.587A8.135 8.135 0 0 0 2.08 10c0 1.33.315 2.603.875 3.763.286 1.034 1.266 1.587 2.216 1.587h.783l3.75 3.75c.787.787 2.134.23 2.134-.883V3.383z" /><path d="M15.485 12.357a1.25 1.25 0 0 0 0-1.768 4.196 4.196 0 0 0-5.934 0 1.25 1.25 0 1 0 1.768 1.768 1.696 1.696 0 0 1 2.4 0 1.25 1.25 0 0 0 1.768 0z" /><path d="M13.719 14.375a1.25 1.25 0 0 0 0-1.768c-1.952-1.952-5.118-1.952-7.07 0a1.25 1.25 0 0 0 1.768 1.768c.976-.976 2.559-.976 3.535 0a1.25 1.25 0 0 0 1.768 0z" /></svg></button>`;
    
    const summaryControls = `<div class="summary-controls">${readAloudButton}${arrowIcon}</div>`;

    const connections = state.dataStore.connections[item.id];
    const connectionsHtml = connections ? `<div class="connections-hub"><h4 class="connections-title">Related Topics:</h4><div class="connections-tags">${connections.map(c => `<button class="connection-tag" data-target-id="${c.targetId}">${c.label}</button>`).join('')}</div></div>` : '';

    let subContent = item.content || '';
    if (item.subItems?.length > 0) {
        subContent = item.subItems.map((subKey, idx) => {
            if (typeof subKey === 'object') return createAccordionItem(subKey, level + 1, idx, item.subItems.length);
            const subData = state.dataStore.kings[subKey] || state.dataStore.other[subKey] || {};
            return createAccordionItem({ id: subKey, ...subData }, level + 1, idx, item.subItems.length);
        }).join('');
    }

    return `
        <details id="${detailsId}" class="${detailsClass} ${colorClass}" data-level="${level}">
            <summary class="${summaryClass}">${summaryContent}${summaryControls}</summary>
            <div class="${contentClass}">${subContent}${connectionsHtml}</div>
        </details>`;
};

/**
 * Renders a specific timeline section based on its ID.
 * @param {string} timelineId - The ID of the timeline to render.
 */
export const renderTimeline = (timelineId) => {
    const timelineData = state.dataStore.dynasty[timelineId];
    if (!timelineData) return;

    const container = document.getElementById(timelineId);
    container.innerHTML = `
        <h3 class="main-section-title">${timelineData.title}</h3>
        ${renderVisualTimelineBar(timelineId)}
        ${timelineData.items.map((item, index) => createAccordionItem(item, 0, index, timelineData.items.length)).join('')}
    `;
    applyGlossaryToElement(container);
};

/**
 * Renders the interactive visual timeline bar for a section.
 * @param {string} timelineId - The ID of the timeline section.
 * @returns {string} The HTML for the timeline bar.
 */
export const renderVisualTimelineBar = (timelineId) => {
    const data = state.dataStore.timelineData[timelineId];
    if (!data?.dynasties?.length) return '';

    const totalDuration = data.end - data.start;
    const blocks = data.dynasties.map(d => {
        const duration = d.end - d.start;
        const width = (duration / totalDuration) * 100;
        const label = `${d.name} (${duration} yrs)`;
        return `<button class="timeline-block" style="width:${width}%;background-color:${d.color};" data-target-id="${d.detailsId}" title="${label}" aria-label="Go to ${d.name}">${label}</button>`;
    }).join('');

    return `<div class="visual-timeline-container" aria-label="Visual timeline"><div class="visual-timeline-bar">${blocks}</div></div>`;
};


// --- [UI/UX & INTERACTIVITY] ---

/**
 * Manages the UI transition between timeline selection and content view.
 * @param {string|null} timelineId - The ID of the timeline to show, or null to show the menu.
 */
export const showTimeline = (timelineId) => {
    const timelineSelection = document.getElementById('timeline-selection');
    const timelineContent = document.getElementById('timeline-content');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchBar = document.getElementById('search-bar');

    state.setCurrentTimeline(timelineId);
    stopSpeech();
    searchResultsContainer.classList.add('hidden');
    searchBar.value = '';

    if (timelineId) {
        timelineSelection.classList.add('hidden');
        timelineContent.classList.remove('hidden');
        timelineContent.querySelectorAll('.timeline-section').forEach(section => {
            section.classList.toggle('hidden', section.id !== timelineId);
        });
        if (!document.getElementById(timelineId).hasChildNodes()) {
            renderTimeline(timelineId);
        }
    } else {
        timelineSelection.classList.remove('hidden');
        timelineContent.classList.add('hidden');
    }
    updateBreadcrumbs();
};

/**
 * Updates the breadcrumb navigation based on the current view.
 */
export const updateBreadcrumbs = () => {
    const nav = document.getElementById('breadcrumb-nav');
    const homeText = state.dataStore.part.breadcrumbHome || 'Home';
    let crumbs = `<button class="breadcrumb-item" data-target="home">${homeText}</button>`;
    if (state.currentTimeline) {
        const title = state.dataStore.dynasty[state.currentTimeline].title.split('(')[1]?.replace(')', '').trim() || state.currentTimeline;
        crumbs += `<span class="breadcrumb-separator">/</span><span class="breadcrumb-item-current">${title}</span>`;
    }
    nav.innerHTML = crumbs;
};

/**
 * Smoothly scrolls to and highlights a target element.
 * @param {string} targetId - The ID of the element to navigate to.
 */
export const navigateToElement = (targetId) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const parentSection = target.closest('.timeline-section');
    if (parentSection) {
        parentSection.querySelectorAll(':scope > details[data-level="0"]').forEach(d => {
            d.style.display = '';
        });
    }

    let parent = target.parentElement;
    while (parent) {
        if (parent.tagName === 'DETAILS') parent.open = true;
        parent = parent.parentElement;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('highlight-search-target');
    setTimeout(() => target.classList.remove('highlight-search-target'), 1500);
};

/**
 * Recursively updates the max-height of all open parent accordions.
 * This ensures that when a nested accordion is opened or closed, the parent
 * containers expand or shrink correctly to fit the new content.
 * @param {HTMLElement} element - The starting element (the one that was toggled).
 */
function updateParentAccordions(element) {
    // Find the immediate parent <details> element that is currently open.
    const parentDetails = element.parentElement.closest('details[open]');

    // Base case: If there are no more open parent <details>, stop the recursion.
    if (!parentDetails) {
        return;
    }

    const parentContentPanel = parentDetails.querySelector('.content-panel');
    if (parentContentPanel) {
        // We use requestAnimationFrame to ensure the browser has calculated the new
        // scrollHeight of the parent before we try to set its maxHeight. This prevents
        // jerky animations and incorrect height calculations.
        requestAnimationFrame(() => {
            parentContentPanel.style.maxHeight = `${parentContentPanel.scrollHeight}px`;
        });
    }

    // Continue recursing up the DOM tree to update all ancestors.
    updateParentAccordions(parentDetails);
}


/**
 * Handles smooth accordion open/close animations and focus mode.
 * @param {HTMLDetailsElement} details - The details element being toggled.
 */
export const handleAccordionToggle = (details) => {
    const contentPanel = details.querySelector('.content-panel');
    if (!contentPanel) return;

    if (details.open) {
        // When opening, set max-height to its content's scroll height.
        contentPanel.style.maxHeight = `${contentPanel.scrollHeight}px`;
    } else {
        // When closing, we need to animate it shut.
        // First, set the height explicitly (it might be 'auto').
        // Then, in the next frame, set it to 0 to trigger the CSS transition.
        requestAnimationFrame(() => {
            contentPanel.style.maxHeight = `${contentPanel.scrollHeight}px`;
            requestAnimationFrame(() => {
                contentPanel.style.maxHeight = '0px';
            });
        });
    }

    // After any toggle, we must update the heights of all parent accordions
    // to ensure the layout adjusts to the change in content size.
    updateParentAccordions(details);


    // This is the 'focus mode' logic for top-level accordions (dynasties).
    // When one is opened, all other top-level ones are hidden.
    if (details.dataset.level === '0') {
        const allTopLevel = details.closest('.timeline-section')?.querySelectorAll(':scope > details[data-level="0"]');
        allTopLevel?.forEach(d => {
            if (details.open && d !== details) {
                d.style.display = 'none';
            } else {
                d.style.display = '';
            }
        });
    }
};

// --- [SEARCH] ---

/**
 * Performs a search and renders the results.
 * @param {string} query - The search term.
 */
export const performSearch = (query) => {
    const resultsContainer = document.getElementById('search-results-container');
    const timelineSelection = document.getElementById('timeline-selection');
    const timelineContent = document.getElementById('timeline-content');

    if (!query || query.trim().length < 2) {
        resultsContainer.classList.add('hidden');
        if (!state.currentTimeline) timelineSelection.classList.remove('hidden');
        else timelineContent.classList.remove('hidden');
        return;
    }

    stopSpeech();
    timelineSelection.classList.add('hidden');
    timelineContent.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    const searchTerms = query.toLowerCase().split(' ').filter(t => t);
    const results = state.searchIndex.filter(item => searchTerms.every(term => item.text.includes(term)));
    renderSearchResults(results, searchTerms);
};

/**
 * Renders the search results to the DOM.
 * @param {Array<object>} results - The array of search result objects.
 * @param {Array<string>} searchTerms - The terms to highlight.
 */
export const renderSearchResults = (results, searchTerms) => {
    const container = document.getElementById('search-results-container');
    if (results.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 mt-8">No results found.</p>';
        return;
    }
    const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
    container.innerHTML = results.map(r => {
        let snippet = '';
        const matchIndex = r.text.indexOf(searchTerms[0]);
        if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 50);
            snippet = (start > 0 ? '...' : '') + r.text.substring(start, matchIndex + 150) + '...';
        }
        return `
            <button class="search-result-item" data-timeline-id="${r.timelineId}" data-target-id="${r.id}">
                <div class="search-result-path">${r.path.split(' > ')[0]}</div>
                <div class="search-result-title">${r.title}</div>
                <div class="search-result-snippet">${snippet.replace(regex, '<mark>$1</mark>')}</div>
            </button>`;
    }).join('');
};

// --- [GLOSSARY] ---

/**
 * Finds all key terms in an element and makes them interactive.
 * @param {HTMLElement} element - The parent element to scan.
 */
export const applyGlossaryToElement = (element) => {
    const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (treeWalker.nextNode()) textNodes.push(treeWalker.currentNode);

    const glossaryTerms = Object.keys(state.dataStore.glossary);
    const regex = new RegExp(`\\b(${glossaryTerms.join('|')})\\b`, 'g');

    textNodes.forEach(node => {
        if (node.parentElement.closest('button.key-term')) return;
        if (!regex.test(node.textContent)) return;
        
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        node.textContent.replace(regex, (match, offset) => {
            fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex, offset)));
            const button = document.createElement('button');
            button.className = 'key-term';
            button.textContent = match;
            button.dataset.term = match;
            fragment.appendChild(button);
            lastIndex = offset + match.length;
        });
        fragment.appendChild(document.createTextNode(node.textContent.substring(lastIndex)));
        node.parentNode.replaceChild(fragment, node);
    });
};

/**
 * Creates and displays the glossary popover.
 * @param {HTMLElement} targetButton - The button that was clicked.
 */
export const renderGlossaryPopover = (targetButton) => {
    dismissGlossaryPopover(); // Remove any existing popover first
    const termData = state.dataStore.glossary[targetButton.dataset.term];
    if (!termData) return;

    const popover = document.createElement('div');
    popover.className = 'glossary-popover';
    popover.setAttribute('role', 'dialog');
    popover.innerHTML = `
        <div class="glossary-popover-header">
            <div class="glossary-titles"><h3 class="glossary-popover-title">${termData.title_hi}</h3></div>
            <div class="glossary-controls">
                <button class="language-toggle" data-lang="en" aria-label="Switch to English">En</button>
                <button class="read-aloud-btn" data-type="glossary" aria-label="Read definition"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M11.25 3.383c0-1.113-1.347-1.67-2.134-.883l-3.75 3.75H4.58c-.95 0-1.93.553-2.216 1.587A8.135 8.135 0 0 0 2.08 10c0 1.33.315 2.603.875 3.763.286 1.034 1.266 1.587 2.216 1.587h.783l3.75 3.75c.787.787 2.134.23 2.134-.883V3.383z" /><path d="M15.485 12.357a1.25 1.25 0 0 0 0-1.768 4.196 4.196 0 0 0-5.934 0 1.25 1.25 0 1 0 1.768 1.768 1.696 1.696 0 0 1 2.4 0 1.25 1.25 0 0 0 1.768 0z" /><path d="M13.719 14.375a1.25 1.25 0 0 0 0-1.768c-1.952-1.952-5.118-1.952-7.07 0a1.25 1.25 0 0 0 1.768 1.768c.976-.976 2.559-.976 3.535 0a1.25 1.25 0 0 0 1.768 0z" /></svg></button>
                <button class="glossary-popover-close" aria-label="Close">&times;</button>
            </div>
        </div>
        <div class="glossary-popover-content"><p>${termData.definition_hi}</p></div>
        <button class="glossary-learn-more hidden" aria-label="Show full definition">Learn More</button>`;
    document.body.appendChild(popover);

    const rect = targetButton.getBoundingClientRect();
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom + window.scrollY + 8}px`;

    const popoverRect = popover.getBoundingClientRect();
    if (popoverRect.right > window.innerWidth - 16) popover.style.left = `${window.innerWidth - popoverRect.width - 16}px`;
    if (popoverRect.bottom > window.innerHeight) popover.style.top = `${rect.top + window.scrollY - popoverRect.height - 8}px`;

    const contentP = popover.querySelector('.glossary-popover-content p');
    if (contentP.scrollHeight > contentP.clientHeight) {
        popover.querySelector('.glossary-popover-content').classList.add('is-truncated');
        popover.querySelector('.glossary-learn-more').classList.remove('hidden');
    }

    requestAnimationFrame(() => popover.classList.add('visible'));
};

/** Removes the glossary popover from the DOM. */
export const dismissGlossaryPopover = () => {
    const popover = document.querySelector('.glossary-popover');
    if (popover) {
        popover.remove();
        stopSpeech();
    }
};


// --- [EVENT HANDLER WRAPPERS] ---

export const handleTimelineCardClick = (card) => showTimeline(card.dataset.target);
export const handleBreadcrumbClick = (item) => { if (item.dataset.target === 'home') showTimeline(null); };
export const handleSearchResultClick = (item) => {
    const { timelineId, targetId } = item.dataset;
    showTimeline(timelineId);
    setTimeout(() => navigateToElement(targetId), 100);
};
export const handleTimelineBlockClick = (block) => navigateToElement(block.dataset.targetId);
export const handleConnectionTagClick = (tag) => {
    const targetId = tag.dataset.targetId;
    const targetItem = state.searchIndex.find(item => item.id === targetId);
    if (targetItem) {
        showTimeline(targetItem.timelineId);
        setTimeout(() => navigateToElement(targetId), 100);
    }
};
export const handleKeyTermClick = (button) => renderGlossaryPopover(button);
export const handleGlossaryClose = (button) => button.closest('.glossary-popover').remove();
export const handleLanguageToggle = (toggle) => {
    const popover = toggle.closest('.glossary-popover');
    const titleEl = popover.querySelector('.glossary-popover-title');
    const contentEl = popover.querySelector('.glossary-popover-content p');
    const termKey = document.querySelector(`button.key-term[data-term*="${titleEl.textContent.split(/[(¹²]/)[0].trim()}"]`)?.dataset.term;
    if (!termKey) return;
    const termData = state.dataStore.glossary[termKey];
    
    if (toggle.dataset.lang === 'en') {
        titleEl.textContent = termData.title_en;
        contentEl.textContent = termData.definition_en;
        toggle.dataset.lang = 'hi';
        toggle.textContent = 'हिं';
    } else {
        titleEl.textContent = termData.title_hi;
        contentEl.textContent = termData.definition_hi;
        toggle.dataset.lang = 'en';
        toggle.textContent = 'En';
    }
};
export const handleGlossaryLearnMore = (button) => {
    const content = button.previousElementSibling;
    content.style.maxHeight = `${content.querySelector('p').scrollHeight}px`;
    content.classList.remove('is-truncated');
    button.classList.add('hidden');
};