/**
 * @file This script manages the entire lifecycle of the Indian History Timeline SPA.
 * @author [Your Name/Team]
 * @version 2.0.0
 */

// --- [STATE MANAGEMENT] ---
let dataStore = {}; // Holds all fetched JSON data (timelines, glossary, etc.)
let currentTimeline = null; // ID of the currently displayed timeline section
let speechInstance = null; // Holds the global SpeechSynthesisUtterance instance
let speechState = {
    isSpeaking: false,
    currentButton: null,
};
let searchIndex = []; // Holds the flattened data for searching

// --- [DATA FETCHING] ---
/**
 * Fetches all necessary JSON data in parallel.
 * @returns {Promise<void>}
 */
const fetchData = async () => {
    try {
        const [part, dynasty, kings, other, glossary, connections, timelineData] = await Promise.all([
            fetch('part.json').then(res => res.json()),
            fetch('dynasty.json').then(res => res.json()),
            fetch('kings.json').then(res => res.json()),
            fetch('other.json').then(res => res.json()),
            fetch('Glossary.json').then(res => res.json()),
            fetch('ConnectionsData.json').then(res => res.json()),
            fetch('TimelineData.json').then(res => res.json()),
        ]);
        dataStore = { part, dynasty, kings, other, glossary, connections, timelineData };
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        // Display a user-friendly error message on the page
    }
};

// --- [RENDERING LOGIC] ---

/**
 * Creates and populates the main timeline selection cards.
 */
const renderTimelineSelection = () => {
    const container = document.getElementById('timeline-selection');
    const cards = dataStore.part.timelineCards.map(card => `
        <div class="timeline-card" data-target="${card.target}" role="button" tabindex="0" aria-label="Select timeline: ${card.subtitle}">
            <span class="timeline-title">${card.title}</span>
            <span class="timeline-subtitle">${card.subtitle}</span>
            <span class="timeline-period">${card.period}</span>
        </div>
    `).join('');
    container.innerHTML = cards;
};

/**
 * Creates the HTML for a single accordion item (dynasty, king, or event).
 * @param {object} item - The data object for the accordion item.
 * @param {number} level - The nesting level (0 for top-level, 1 for inner, etc.).
 * @param {number} index - The index of the item at its level, for color coding.
 * @param {number} totalItems - The total number of items at the same level.
 * @returns {string} The HTML string for the accordion item.
 */
const createAccordionItem = (item, level, index, totalItems) => {
    const detailsId = item.id || `item-${Date.now()}-${Math.random()}`;
    let detailsClass, summaryClass, contentClass;
    let colorClass = '';

    // Determine classes based on nesting level
    if (level === 0) {
        detailsClass = 'dynasty-details';
        summaryClass = 'dynasty-summary';
        contentClass = 'content-panel';
    } else {
        detailsClass = 'king-details';
        summaryClass = 'king-summary';
        contentClass = 'content-panel';
        
        // --- [NEW] King Color Coding System ---
        if (item.type && item.type.includes('king-details')) {
             if (index === totalItems - 1) {
                 colorClass = 'king-color-last';
             } else {
                 const colorIndex = (index % 12) + 1; // Cycle through 12 colors
                 colorClass = `king-color-${colorIndex}`;
             }
        }
        if (item.type && item.type.includes('invasion-type-iranian')) {
            colorClass = 'invasion-type-iranian';
        }
        if (item.type && item.type.includes('invasion-type-greek')) {
            colorClass = 'invasion-type-greek';
        }
        if (item.type && item.type.includes('enhanced-profile')) {
            detailsClass += ' enhanced-profile';
        }

    }

    const title = item.summary.title || 'No Title';
    const period = item.summary.period || item.summary.reign || '';
    
    // --- [NEW] At-a-glance info for dynasties ---
    const founder = item.summary.founder ? `<span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" /></svg><strong>Founder:</strong> ${item.summary.founder}</span>` : '';
    const capital = item.summary.capital ? `<span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M4 1.5a.5.5 0 0 0-.5.5v11.586l3.5-3.5 3.5 3.5V2a.5.5 0 0 0-.5-.5h-6Z" clip-rule="evenodd" /></svg><strong>Capital:</strong> ${item.summary.capital}</span>` : '';
    const dynastyMeta = (founder || capital) ? `<div class="dynasty-meta">${founder}${capital}</div>` : '';

    const summaryContent = level === 0 ? `
        <div class="summary-content-wrapper">
            <div class="summary-title-line">
                <span class="summary-title">${title}</span>
                ${period ? `<span class="dynasty-period">${period}</span>` : ''}
            </div>
            ${dynastyMeta}
        </div>
    ` : `
        <span class="summary-title">${title}</span>
        ${period ? `<span class="king-reign">${period}</span>` : ''}
    `;

    const arrowIcon = level === 0 
        ? `<svg class="arrow w-6 h-6 text-indigo-500 transform transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>`
        : `<span class="arrow-inner text-indigo-600" aria-hidden="true">▶</span>`;
        
    // --- [NEW] ACCESSIBILITY FIX: Read Aloud button is now a sibling, not a child ---
    const readAloudButton = `<button class="read-aloud-btn" aria-label="Read ${title} aloud"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.787 2.213A.75.75 0 0 0 6.75 3v10.5a.75.75 0 0 0 1.037.713l8.25-5.25a.75.75 0 0 0 0-1.426l-8.25-5.25Z" /><path d="M2.25 3A.75.75 0 0 0 1.5 3.75v8.5A.75.75 0 0 0 2.25 13h1.5a.75.75 0 0 0 0-1.5H3V4.5h.75a.75.75 0 0 0 0-1.5h-1.5Z" /></svg></button>`;

    // --- [NEW] Connections Hub ---
    const connections = dataStore.connections[item.id];
    const connectionsHtml = connections ? `
        <div class="connections-hub">
            <h4 class="connections-title">Related Topics:</h4>
            <div class="connections-tags">
                ${connections.map(conn => `<button class="connection-tag" data-target-id="${conn.targetId}">${conn.label}</button>`).join('')}
            </div>
        </div>
    ` : '';
        
    // Recursively build content for sub-items
    let subContent = '';
    if (item.subItems && item.subItems.length > 0) {
        subContent = item.subItems.map((subItemKey, idx) => {
            const subItemData = dataStore.kings[subItemKey] || dataStore.other[subItemKey] || { type: 'dynasty-details', summary: { title: 'Unknown' }, subItems: [] };
             // --- [FIX] Defensive Rendering ---
            if (typeof subItemKey === 'object') { // Handles cases where subItems are objects, not keys
                return createAccordionItem(subItemKey, level + 1, idx, item.subItems.length);
            }
            const fullSubItemData = { id: subItemKey, ...subItemData };
            return createAccordionItem(fullSubItemData, level + 1, idx, item.subItems.length);
        }).join('');
    } else if (item.content) {
        subContent = item.content;
    }

    // --- [NEW] ACCESSIBILITY FIX: Wrapper for details + button ---
    return `
        <div class="details-wrapper">
            <details id="${detailsId}" class="${detailsClass} ${colorClass}" data-level="${level}">
                <summary class="${summaryClass}">
                    ${summaryContent}
                    ${arrowIcon}
                </summary>
                <div class="${contentClass}">
                    ${subContent}
                    ${connectionsHtml}
                </div>
            </details>
            ${readAloudButton}
        </div>
    `;
};


/**
 * Renders a specific timeline section based on its ID.
 * @param {string} timelineId - The ID of the timeline to render (e.g., 'magadha').
 */
const renderTimeline = (timelineId) => {
    const timelineData = dataStore.dynasty[timelineId];
    if (!timelineData) return;

    const container = document.getElementById(timelineId);
    container.innerHTML = `
        <h3 class="main-section-title">${timelineData.title}</h3>
        ${renderVisualTimelineBar(timelineId)}
        ${timelineData.items.map((item, index) => createAccordionItem(item, 0, index, timelineData.items.length)).join('')}
    `;

    // Re-apply glossary terms and other dynamic elements
    applyGlossaryToElement(container);
};


/**
 * Renders the interactive visual timeline bar for a section.
 * @param {string} timelineId - The ID of the timeline section.
 * @returns {string} The HTML for the timeline bar.
 */
const renderVisualTimelineBar = (timelineId) => {
    const data = dataStore.timelineData[timelineId];
    if (!data || !data.dynasties || data.dynasties.length === 0) return '';

    const totalDuration = data.end - data.start;

    const blocks = data.dynasties.map(dynasty => {
        const duration = dynasty.end - dynasty.start;
        const widthPercentage = (duration / totalDuration) * 100;
        const label = `${dynasty.name} (${duration} yrs)`;
        return `<button class="timeline-block" style="width: ${widthPercentage}%; background-color: ${dynasty.color};" data-target-id="${dynasty.detailsId}" title="${label}" aria-label="Go to ${dynasty.name}">${label}</button>`;
    }).join('');

    return `
        <div class="visual-timeline-container" aria-label="Visual timeline of dynasties">
            <div class="visual-timeline-bar">
                ${blocks}
            </div>
        </div>
    `;
};

// --- [UI/UX & INTERACTIVITY] ---

/**
 * Manages the UI transition between timeline selection and content view.
 * @param {string|null} timelineId - The ID of the timeline to show, or null to show the menu.
 */
const showTimeline = (timelineId) => {
    const timelineSelection = document.getElementById('timeline-selection');
    const timelineContent = document.getElementById('timeline-content');
    const allSections = timelineContent.querySelectorAll('.timeline-section');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchBar = document.getElementById('search-bar');
    
    currentTimeline = timelineId;

    // Reset UI state
    stopSpeech();
    searchResultsContainer.classList.add('hidden');
    searchBar.value = '';

    if (timelineId) {
        // Show a specific timeline
        timelineSelection.classList.add('hidden');
        timelineContent.classList.remove('hidden');
        allSections.forEach(section => {
            section.classList.toggle('hidden', section.id !== timelineId);
        });
        // Render if it's the first time
        if (!document.getElementById(timelineId).hasChildNodes()) {
            renderTimeline(timelineId);
        }
    } else {
        // Show the main menu
        timelineSelection.classList.remove('hidden');
        timelineContent.classList.add('hidden');
    }
    
    updateBreadcrumbs();
};

/**
 * Updates the breadcrumb navigation based on the current view.
 */
const updateBreadcrumbs = () => {
    const nav = document.getElementById('breadcrumb-nav');
    const homeText = dataStore.part.breadcrumbHome || 'Home';
    
    let breadcrumbs = `<button class="breadcrumb-item" data-target="home">${homeText}</button>`;
    
    if (currentTimeline) {
        const timelineTitle = dataStore.dynasty[currentTimeline].title.split('(')[1]?.replace(')','').trim() || currentTimeline;
        breadcrumbs += `<span class="breadcrumb-separator">/</span><span class="breadcrumb-item-current">${timelineTitle}</span>`;
    }
    
    nav.innerHTML = breadcrumbs;
};

/**
 * Smoothly scrolls to and highlights a target element.
 * @param {string} targetId - The ID of the element to navigate to.
 */
const navigateToElement = (targetId) => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    // --- [BUG FIX] Reset focus mode before navigating ---
    // Find the parent timeline section
    const parentSection = targetElement.closest('.timeline-section');
    if (parentSection) {
        const topLevelDetails = parentSection.querySelectorAll(':scope > .details-wrapper > details[data-level="0"]');
        topLevelDetails.forEach(d => {
            d.style.display = ''; // Reset display style
        });
    }

    // Open all parent <details> elements
    let parent = targetElement.parentElement;
    while (parent) {
        if (parent.tagName === 'DETAILS') {
            parent.open = true;
        }
        parent = parent.parentElement;
    }

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Highlight the element
    targetElement.classList.add('highlight-search-target');
    setTimeout(() => {
        targetElement.classList.remove('highlight-search-target');
    }, 1500);
};


/**
 * Handles smooth accordion open/close animations.
 * @param {HTMLDetailsElement} details - The details element being toggled.
 */
const handleAccordionToggle = (details) => {
    const contentPanel = details.querySelector('.content-panel');
    if (!contentPanel) return;

    if (details.open) {
        // Is opening
        contentPanel.style.maxHeight = `${contentPanel.scrollHeight}px`;
    } else {
        // Is closing
        // We need to set the current height explicitly before transitioning to 0
        requestAnimationFrame(() => {
            contentPanel.style.maxHeight = `${contentPanel.scrollHeight}px`;
            requestAnimationFrame(() => {
                contentPanel.style.maxHeight = '0px';
            });
        });
    }
    
    // --- [FIX] Adjust parent accordion heights if nested. This is more robust.
    const parentDetails = details.parentElement.closest('details[open]');
    if (parentDetails) {
        const parentContentPanel = parentDetails.querySelector('.content-panel');
        if (parentContentPanel) {
            // This ensures the parent resizes to fit its new content height
            parentContentPanel.style.maxHeight = `${parentContentPanel.scrollHeight}px`;
        }
    }

    // --- [NEW] Focus Mode ---
    const isTopLevel = details.dataset.level === '0';
    if (isTopLevel) {
        const parentSection = details.closest('.timeline-section');
        if (parentSection) {
            const allTopLevelDetails = parentSection.querySelectorAll(':scope > .details-wrapper > details[data-level="0"]');
            if (details.open) {
                // When one opens, hide others
                allTopLevelDetails.forEach(d => {
                    if (d !== details) {
                        d.style.display = 'none';
                    }
                });
            } else {
                // When it closes, show all again
                allTopLevelDetails.forEach(d => {
                    d.style.display = '';
                });
            }
        }
    }
};


// --- [SEARCH FUNCTIONALITY] ---

/**
 * Creates a flat, searchable index from the nested data.
 */
const buildSearchIndex = () => {
    searchIndex = [];
    Object.keys(dataStore.dynasty).forEach(timelineId => {
        const timeline = dataStore.dynasty[timelineId];
        const timelinePath = timeline.title.split('(')[1]?.replace(')', '').trim() || timeline.title;

        const traverse = (item, path, parentId) => {
            const currentId = item.id || parentId;
            const currentPath = [...path, item.summary.title];
            
            // --- [NEW] Include founder and capital in searchable text ---
            const founderText = item.summary.founder ? `founder ${item.summary.founder}` : '';
            const capitalText = item.summary.capital ? `capital ${item.summary.capital}` : '';

            // Extract text from content for snippet generation
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content || '';
            const contentText = tempDiv.textContent || tempDiv.innerText || '';

            searchIndex.push({
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
                        const subItemData = dataStore.kings[subItemKey] || dataStore.other[subItemKey];
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
};

/**
 * Performs a search based on the input query.
 * @param {string} query - The search term.
 */
const performSearch = (query) => {
    const resultsContainer = document.getElementById('search-results-container');
    const timelineSelection = document.getElementById('timeline-selection');
    const timelineContent = document.getElementById('timeline-content');

    if (!query || query.trim().length < 2) {
        resultsContainer.classList.add('hidden');
        if (!currentTimeline) {
            timelineSelection.classList.remove('hidden');
        } else {
            timelineContent.classList.remove('hidden');
        }
        return;
    }
    
    stopSpeech();
    timelineSelection.classList.add('hidden');
    timelineContent.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    
    const searchTerms = query.toLowerCase().split(' ').filter(t => t);
    const results = searchIndex.filter(item => {
        return searchTerms.every(term => item.text.includes(term));
    });
    
    renderSearchResults(results, searchTerms);
};

/**
 * Renders the search results to the DOM.
 * @param {Array<object>} results - The array of search result objects.
 * @param {Array<string>} searchTerms - The terms to highlight.
 */
const renderSearchResults = (results, searchTerms) => {
    const container = document.getElementById('search-results-container');
    if (results.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 mt-8">No results found.</p>';
        return;
    }
    
    const resultsHtml = results.map(result => {
        // Create snippet
        let snippet = '';
        const text = result.text;
        const firstMatchIndex = text.indexOf(searchTerms[0]);
        if (firstMatchIndex !== -1) {
            const start = Math.max(0, firstMatchIndex - 50);
            const end = Math.min(text.length, firstMatchIndex + 150);
            snippet = text.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < text.length) snippet += '...';
        }

        // Highlight terms
        const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
        const highlightedSnippet = snippet.replace(regex, '<mark>$1</mark>');

        return `
            <button class="search-result-item" data-timeline-id="${result.timelineId}" data-target-id="${result.id}">
                <div class="search-result-path">${result.path.split(' > ')[0]}</div>
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-snippet">${highlightedSnippet}</div>
            </button>
        `;
    }).join('');

    container.innerHTML = resultsHtml;
};

// --- [GLOSSARY & SPEECH] ---

/**
 * Finds all key terms in an element and makes them interactive.
 * @param {HTMLElement} element - The parent element to scan for glossary terms.
 */
const applyGlossaryToElement = (element) => {
    const allTextNodes = [];
    const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = treeWalker.nextNode()) {
        allTextNodes.push(node);
    }
    
    const glossaryTerms = Object.keys(dataStore.glossary);
    const regex = new RegExp(`\\b(${glossaryTerms.join('|')})\\b`, 'g');

    allTextNodes.forEach(textNode => {
        if (textNode.parentElement.tagName === 'BUTTON' && textNode.parentElement.classList.contains('key-term')) {
            return; // Already processed
        }
        
        const text = textNode.textContent;
        if (regex.test(text)) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            text.replace(regex, (match, offset) => {
                // Add preceding text
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
                // Add the button
                const button = document.createElement('button');
                button.className = 'key-term';
                button.textContent = match;
                button.dataset.term = match;
                fragment.appendChild(button);
                lastIndex = offset + match.length;
            });
            // Add remaining text
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
};

/**
 * Creates and displays the glossary popover.
 * @param {HTMLElement} targetButton - The button that was clicked.
 */
const renderGlossaryPopover = (targetButton) => {
    // Remove any existing popover
    const existingPopover = document.querySelector('.glossary-popover');
    if (existingPopover) existingPopover.remove();
    
    const termKey = targetButton.dataset.term;
    const termData = dataStore.glossary[termKey];
    if (!termData) return;
    
    const popover = document.createElement('div');
    popover.className = 'glossary-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');
    popover.setAttribute('aria-labelledby', 'glossary-title');
    
    popover.innerHTML = `
        <div class="glossary-popover-header">
            <div class="glossary-titles">
                 <h3 id="glossary-title" class="glossary-popover-title">${termData.title_hi}</h3>
            </div>
            <div class="glossary-controls">
                <button class="language-toggle" data-lang="en" aria-label="Switch to English">En</button>
                <button class="read-aloud-btn" data-type="glossary" aria-label="Read definition aloud"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.787 2.213A.75.75 0 0 0 6.75 3v10.5a.75.75 0 0 0 1.037.713l8.25-5.25a.75.75 0 0 0 0-1.426l-8.25-5.25Z" /><path d="M2.25 3A.75.75 0 0 0 1.5 3.75v8.5A.75.75 0 0 0 2.25 13h1.5a.75.75 0 0 0 0-1.5H3V4.5h.75a.75.75 0 0 0 0-1.5h-1.5Z" /></svg></button>
                <button class="glossary-popover-close" aria-label="Close popover">&times;</button>
            </div>
        </div>
        <div class="glossary-popover-content">
            <p>${termData.definition_hi}</p>
        </div>
        <button class="glossary-learn-more hidden" aria-label="Show full definition">Learn More</button>
    `;

    document.body.appendChild(popover);

    // Intelligent positioning
    const rect = targetButton.getBoundingClientRect();
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
    
    // Check for overflow and reposition if necessary
    const popoverRect = popover.getBoundingClientRect();
    if (popoverRect.right > window.innerWidth - 16) {
        popover.style.left = `${window.innerWidth - popoverRect.width - 16}px`;
    }
    if (popoverRect.bottom > window.innerHeight) {
        popover.style.top = `${rect.top + window.scrollY - popoverRect.height - 8}px`;
    }
    
    // Check for truncation and show 'Learn More'
    const contentP = popover.querySelector('.glossary-popover-content p');
    if (contentP.scrollHeight > contentP.clientHeight) {
        popover.querySelector('.glossary-popover-content').classList.add('is-truncated');
        popover.querySelector('.glossary-learn-more').classList.remove('hidden');
    }

    // Fade in
    requestAnimationFrame(() => {
        popover.classList.add('visible');
    });
};

/**
 * Handles the text-to-speech functionality.
 * @param {HTMLElement} button - The read-aloud button element that was clicked.
 */
const handleReadAloud = async (button) => {
    if (speechState.isSpeaking && speechState.currentButton === button) {
        stopSpeech();
        return;
    }

    stopSpeech(); // Stop any previous speech before starting new

    let textToRead = '';
    
    if (button.dataset.type === 'glossary') {
        const popover = button.closest('.glossary-popover');
        if (popover) {
            const contentP = popover.querySelector('.glossary-popover-content p');
            if (contentP) textToRead = contentP.textContent;
        }
    } else {
        const detailsWrapper = button.closest('.details-wrapper');
        if (detailsWrapper) {
            const details = detailsWrapper.querySelector('details');
            if (details) {
                const summary = details.querySelector('summary');
                if (summary) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = summary.innerHTML;
                    const arrow = tempDiv.querySelector('.arrow, .arrow-inner');
                    if (arrow) arrow.remove();
                    textToRead = tempDiv.textContent.trim().replace(/\s+/g, ' ');
                }
            }
        }
    }

    if (!textToRead) return;

    speechInstance = new SpeechSynthesisUtterance(textToRead);
    speechInstance.lang = 'hi-IN'; // Default to Hindi, can be adjusted
    
    speechState.isSpeaking = true;
    speechState.currentButton = button;
    button.classList.add('speaking');
    
    speechInstance.onend = () => {
        stopSpeech();
    };

    window.speechSynthesis.speak(speechInstance);
};

/**
 * Stops any ongoing speech and resets the UI state.
 */
const stopSpeech = () => {
    if (speechState.isSpeaking) {
        window.speechSynthesis.cancel();
        speechState.isSpeaking = false;
    }
    if (speechState.currentButton) {
        speechState.currentButton.classList.remove('speaking');
        speechState.currentButton = null;
    }
    speechInstance = null;
};


// --- [EVENT LISTENERS & INITIALIZATION] ---

/**
 * Main function to initialize the app.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader-overlay');
    const mainContent = document.getElementById('main-content');
    
    await fetchData();
    
    // Populate UI text from part.json
    document.getElementById('subtitle').textContent = dataStore.part.subtitle;
    document.getElementById('search-bar').placeholder = dataStore.part.searchPlaceholder;

    renderTimelineSelection();
    buildSearchIndex();
    updateBreadcrumbs();

    // Event Delegation for better performance
    const body = document.body;
    body.addEventListener('click', (event) => {
        const target = event.target;

        // Timeline card selection
        const timelineCard = target.closest('.timeline-card');
        if (timelineCard) {
            showTimeline(timelineCard.dataset.target);
            return;
        }
        
        // Breadcrumb navigation
        const breadcrumbItem = target.closest('.breadcrumb-item');
        if (breadcrumbItem) {
            if (breadcrumbItem.dataset.target === 'home') {
                showTimeline(null);
            }
            return;
        }
        
        // Search result navigation
        const searchResult = target.closest('.search-result-item');
        if (searchResult) {
            const { timelineId, targetId } = searchResult.dataset;
            showTimeline(timelineId);
            // Wait for render to complete before navigating
            setTimeout(() => navigateToElement(targetId), 100);
            return;
        }

        // Visual timeline bar navigation
        const timelineBlock = target.closest('.timeline-block');
        if (timelineBlock) {
            navigateToElement(timelineBlock.dataset.targetId);
            return;
        }
        
        // Connection tag navigation
        const connectionTag = target.closest('.connection-tag');
        if (connectionTag) {
            const targetId = connectionTag.dataset.targetId;
            const targetItem = searchIndex.find(item => item.id === targetId);
            if(targetItem) {
                showTimeline(targetItem.timelineId);
                setTimeout(() => navigateToElement(targetId), 100);
            }
            return;
        }

        // Glossary popover
        const keyTermButton = target.closest('button.key-term');
        if (keyTermButton) {
            renderGlossaryPopover(keyTermButton);
            return;
        }
        
        // Close glossary popover
        const closeButton = target.closest('.glossary-popover-close');
        if (closeButton) {
            closeButton.closest('.glossary-popover').remove();
            stopSpeech();
            return;
        }

        // Language toggle in popover
        const langToggle = target.closest('.language-toggle');
        if (langToggle) {
            const popover = langToggle.closest('.glossary-popover');
            const titleEl = popover.querySelector('.glossary-popover-title');
            const contentEl = popover.querySelector('.glossary-popover-content p');
            const termKey = document.querySelector(`button.key-term[data-term="${titleEl.textContent.split('(')[0].trim()}"]`)?.dataset.term || document.querySelector(`button.key-term[data-term*="${titleEl.textContent.split('¹')[0].trim()}"]`)?.dataset.term;
            if (!termKey) return;
            const termData = dataStore.glossary[termKey];
            const currentLang = langToggle.dataset.lang;
            if (currentLang === 'en') {
                titleEl.textContent = termData.title_en;
                contentEl.textContent = termData.definition_en;
                langToggle.dataset.lang = 'hi';
                langToggle.textContent = 'हिं';
                langToggle.setAttribute('aria-label', 'Switch to Hindi');
            } else {
                titleEl.textContent = termData.title_hi;
                contentEl.textContent = termData.definition_hi;
                langToggle.dataset.lang = 'en';
                langToggle.textContent = 'En';
                langToggle.setAttribute('aria-label', 'Switch to English');
            }
             // Re-check for truncation and update UI
            const contentDiv = popover.querySelector('.glossary-popover-content');
            const learnMoreBtn = popover.querySelector('.glossary-learn-more');
            contentDiv.classList.toggle('is-truncated', contentEl.scrollHeight > contentEl.clientHeight);
            learnMoreBtn.classList.toggle('hidden', contentEl.scrollHeight <= contentEl.clientHeight);
            return;
        }
        
        // Glossary 'Learn More'
        const learnMoreBtn = target.closest('.glossary-learn-more');
        if(learnMoreBtn) {
            const content = learnMoreBtn.previousElementSibling;
            content.style.maxHeight = `${content.querySelector('p').scrollHeight}px`;
            content.classList.remove('is-truncated');
            learnMoreBtn.classList.add('hidden');
        }

        // Read Aloud button
        const readAloudButton = target.closest('.read-aloud-btn');
        if (readAloudButton) {
            handleReadAloud(readAloudButton);
            return;
        }
        
        // Close popover if clicking outside
        if (!target.closest('.glossary-popover') && !target.closest('button.key-term')) {
            const existingPopover = document.querySelector('.glossary-popover');
            if (existingPopover) {
                 existingPopover.remove();
                 stopSpeech();
            }
        }
    });
    
    // Accordion toggle handler
    body.addEventListener('toggle', (event) => {
        if (event.target.tagName === 'DETAILS') {
            handleAccordionToggle(event.target);
        }
    }, true); // Use capture phase to handle it before it bubbles

    // Search bar handler with debounce
    let searchTimeout;
    document.getElementById('search-bar').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300); // 300ms debounce
    });

    // --- [INITIAL REVEAL] ---
    loader.classList.add('hidden');
    mainContent.classList.remove('hidden');
});