document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader-overlay');
    const mainContent = document.getElementById('main-content');

    try {
        // --- Data Fetching ---
        const fetchData = async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`Failed to fetch ${url}:`, response.statusText); return {};
                }
                return await response.json();
            } catch (error) {
                console.error(`Error fetching data from ${url}:`, error); return {};
            }
        };
        
        const [glossaryData, timelineData, connectionsData, partData, dynastyData, kingsData] = await Promise.all([
            fetchData('./Glossary.json'),
            fetchData('./TimelineData.json'),
            fetchData('./ConnectionsData.json'),
            fetchData('./part.json'),
            fetchData('./dynasty.json'),
            fetchData('./kings.json'),
        ]);

        // --- DYNAMIC CONTENT RENDERING ---

        const renderStaticParts = () => {
            document.getElementById('subtitle').textContent = partData.subtitle;
            document.getElementById('search-bar').placeholder = partData.searchPlaceholder;
            
            const timelineSelection = document.getElementById('timeline-selection');
            partData.timelineCards.forEach(card => {
                const cardEl = document.createElement('button');
                cardEl.dataset.target = card.target;
                cardEl.className = 'timeline-card';
                cardEl.setAttribute('aria-controls', card.target);
                cardEl.innerHTML = `
                    <span class="timeline-title">${card.title}</span>
                    <span class="timeline-subtitle">${card.subtitle}</span>
                    <span class="timeline-period">${card.period}</span>
                `;
                timelineSelection.appendChild(cardEl);
            });
        };

        const renderContentSections = () => {
            const timelineContent = document.getElementById('timeline-content');
            Object.keys(dynastyData).forEach(sectionKey => {
                const sectionData = dynastyData[sectionKey];
                const sectionEl = document.getElementById(sectionKey);
                if (!sectionEl) return;

                let sectionHTML = `<h3 class="main-section-title">${sectionData.title}</h3>`;

                sectionData.items.forEach(item => {
                    let summaryHTML = '';
                    if (item.type.includes('dynasty')) {
                        const founderHTML = item.summary.founder ? `
                            <span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" clip-rule="evenodd" /></svg><strong>${item.summary.founder.includes(':') ? item.summary.founder.split(':')[0] + ':' : 'संस्थापक:'}</strong> ${item.summary.founder.includes(':') ? item.summary.founder.split(':')[1].trim() : item.summary.founder}</span>
                        ` : '';

                        const capitalHTML = item.summary.capital ? `
                            <span class="meta-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1ZM15 2a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1ZM9 2a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Z" clip-rule="evenodd" /><path d="M2 17.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V17a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v.5Z" /></svg><strong>राजधानी:</strong> ${item.summary.capital}</span>
                        ` : '';
                        
                        const metaHTML = (founderHTML || capitalHTML) ? `
                            <div class="dynasty-meta">
                                ${founderHTML}
                                ${capitalHTML}
                            </div>
                        ` : '';

                        summaryHTML = `
                            <div class="summary-content-wrapper">
                                <div class="summary-title-line">
                                    <span class="summary-title">${item.summary.title}</span>
                                    ${item.summary.period ? `<span class="dynasty-period">${item.summary.period}</span>` : ''}
                                </div>
                                ${metaHTML}
                            </div>`;
                    } else { // event-details summary
                        summaryHTML = `<span class="summary-title">${item.summary.title}</span>`;
                    }

                    let contentHTML = '';
                    if (item.content) {
                        contentHTML = item.content;
                    } else if (item.subItems) {
                        item.subItems.forEach(key => {
                            const subItemData = kingsData[key];
                            if (subItemData) {
                                contentHTML += `
                                    <details id="${key.replace(/\s+/g, '-').toLowerCase()}-details" class="${subItemData.type}">
                                        <summary class="king-summary">
                                            <span class="summary-title">${subItemData.summary.title}</span>
                                            ${subItemData.summary.reign ? `<span class="king-reign">${subItemData.summary.reign}</span>` : ''}
                                            <span class="arrow-inner" aria-hidden="true">▶</span>
                                        </summary>
                                        <div class="content-panel">${subItemData.content}</div>
                                    </details>
                                `;
                            }
                        });
                    }

                    sectionHTML += `
                        <details id="${item.id || ''}" class="${item.type}">
                            <summary class="${item.type.replace('-details', '-summary')}">${summaryHTML}<span class="arrow" aria-hidden="true">▶</span></summary>
                            <div class="content-panel">${contentHTML}</div>
                        </details>
                    `;
                });
                sectionEl.innerHTML = sectionHTML;
            });
        };
        
        // Render all dynamic content first
        renderStaticParts();
        renderContentSections();

        // --- INITIALIZE FEATURES (after DOM is built) ---

        // Existing elements (re-queried after dynamic rendering)
        const timelineSelection = document.getElementById('timeline-selection');
        const timelineContent = document.getElementById('timeline-content');
        const timelineSections = document.querySelectorAll('.timeline-section');
        const subtitle = document.getElementById('subtitle');
        const searchBar = document.getElementById('search-bar');
        const searchResultsContainer = document.getElementById('search-results-container');
        let allDetails = document.querySelectorAll('details');
    
        // --- Breadcrumb Feature Elements ---
        const breadcrumbNav = document.getElementById('breadcrumb-nav');
        let breadcrumbState = [{ name: partData.breadcrumbHome, level: 'home' }];
    
        // --- Search Feature Elements ---
        let searchIndex = [];
        let searchDebounceTimer;

        // --- Read Aloud Feature ---
        const synth = window.speechSynthesis;
        let voices = [];
        let speakingButton = null;

        // --- Read Aloud Logic ---
        const loadVoices = () => {
             return new Promise((resolve) => {
                voices = synth.getVoices();
                if (voices.length) {
                    resolve(voices); return;
                }
                synth.onvoiceschanged = () => {
                    voices = synth.getVoices(); resolve(voices);
                };
            });
        };
        const voicesPromise = loadVoices();

        const getPlayIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M5.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0V2.75Z" /><path d="M8.5 4.75a.75.75 0 0 0-1.5 0v10.5a.75.75 0 0 0 1.5 0V4.75Z" /><path d="M11.5 6.75a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0V6.75Z" /><path d="M14.5 8.75a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0V8.75Z" /></svg>`;
        const getStopIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6-3.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm4 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>`;

        const readAloud = async (text, lang, button) => {
            if (speakingButton === button && synth.speaking) { synth.cancel(); return; }
            if (synth.speaking) { synth.cancel(); }
            await voicesPromise;
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0])) || null;
            if (voice) { utterance.voice = voice; }
            utterance.onstart = () => {
                if (speakingButton) {
                    speakingButton.classList.remove('speaking'); speakingButton.setAttribute('aria-label', 'Read aloud'); speakingButton.innerHTML = getPlayIcon();
                }
                speakingButton = button;
                button.classList.add('speaking'); button.setAttribute('aria-label', 'Stop reading'); button.innerHTML = getStopIcon();
            };
            utterance.onend = () => {
                if (speakingButton) {
                    speakingButton.classList.remove('speaking'); speakingButton.setAttribute('aria-label', 'Read aloud'); speakingButton.innerHTML = getPlayIcon();
                }
                speakingButton = null;
            };
            utterance.onerror = () => {
                 if (speakingButton) {
                    speakingButton.classList.remove('speaking'); speakingButton.setAttribute('aria-label', 'Read aloud'); speakingButton.innerHTML = getPlayIcon();
                }
                speakingButton = null;
            }
            synth.speak(utterance);
        };

        const injectReadAloudButtons = () => {
            document.querySelectorAll('summary').forEach(summary => {
                const titleEl = summary.querySelector('.summary-title');
                if (!titleEl) return;
                const button = document.createElement('button');
                button.className = 'read-aloud-btn';
                button.setAttribute('aria-label', 'Read aloud');
                button.innerHTML = getPlayIcon();
                button.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const text = titleEl.textContent?.trim();
                    if (text) { readAloud(text, 'hi-IN', button); }
                });
                const targetContainer = summary.querySelector('.summary-title-line') || titleEl;
                targetContainer.prepend(button);
            });
        };
    
        // --- Navigation Logic ---
        const navigateToElement = (targetId) => {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                searchResultsContainer.classList.add('hidden');
                timelineContent.style.display = 'block';
                const section = targetElement.closest('.timeline-section');
                if (section) {
                     timelineSections.forEach(sec => sec.classList.add('hidden'));
                     section.classList.remove('hidden');
                }
                let parent = targetElement.parentElement?.closest('details');
                while(parent) {
                    parent.open = true;
                    parent = parent.parentElement?.closest('details');
                }
                targetElement.open = true;
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.querySelectorAll('.highlight-search-target').forEach(el => el.classList.remove('highlight-search-target'));
                const summary = targetElement.querySelector('summary');
                if (summary) {
                    summary.classList.add('highlight-search-target');
                    setTimeout(() => { summary.classList.remove('highlight-search-target'); }, 1500);
                }
                updateBreadcrumbsFromElement(targetElement);
            }
        };
    
        // --- Breadcrumb Logic ---
        const getSummaryName = (summary) => {
            if (!summary) return 'Details';
            const titleElement = summary.querySelector('.summary-title');
            if (titleElement) {
                const titleClone = titleElement.cloneNode(true);
                titleClone.querySelectorAll('*').forEach(child => child.remove());
                return titleClone.textContent?.trim() || 'Details';
            }
            const summaryClone = summary.cloneNode(true);
            summaryClone.querySelectorAll('.arrow, .arrow-inner, .dynasty-period, .king-reign, .dynasty-meta').forEach(el => el.remove());
            return summaryClone.textContent?.trim().replace(/\s+/g, ' ').trim() || 'Details';
        };
    
        const renderBreadcrumbs = () => {
            if (!breadcrumbNav) return;
            breadcrumbNav.innerHTML = '';
            breadcrumbNav.setAttribute('aria-label', 'Breadcrumb');
            const fragment = document.createDocumentFragment();
            breadcrumbState.forEach((crumb, index) => {
                const isLast = index === breadcrumbState.length - 1;
                if (index > 0) {
                    const separator = document.createElement('span');
                    separator.className = 'breadcrumb-separator'; separator.textContent = '>'; separator.setAttribute('aria-hidden', 'true'); fragment.appendChild(separator);
                }
                const crumbElement = document.createElement(isLast ? 'span' : 'button');
                crumbElement.className = isLast ? 'breadcrumb-item-current' : 'breadcrumb-item';
                crumbElement.textContent = crumb.name;
                if (isLast) {
                    crumbElement.setAttribute('aria-current', 'page');
                } else {
                    crumbElement.dataset.level = crumb.level; crumbElement.dataset.id = crumb.id || ''; crumbElement.dataset.index = index.toString();
                }
                fragment.appendChild(crumbElement);
            });
            breadcrumbNav.appendChild(fragment);
        };
    
        const updateAndRenderBreadcrumbs = (newState) => {
            breadcrumbState = newState; renderBreadcrumbs();
        };
    
        const updateBreadcrumbsFromElement = (element) => {
            const path = [{ name: partData.breadcrumbHome, level: 'home' }];
            const section = element.closest('.timeline-section');
            if (!section) { updateAndRenderBreadcrumbs(path); return; }
            const sectionCard = document.querySelector(`.timeline-card[data-target="${section.id}"]`);
            const sectionTitle = sectionCard?.querySelector('.timeline-title')?.textContent || 'Section';
            const sectionSubtitle = sectionCard?.querySelector('.timeline-subtitle')?.textContent || '';
            const fullSectionTitle = `${sectionTitle} (${sectionSubtitle})`;
            path.push({ name: fullSectionTitle, level: 'section', id: section.id });
            const ancestors = [];
            let current = element.parentElement?.closest('details');
            while (current) {
                ancestors.unshift(current);
                current = current.parentElement?.closest('details');
            }
            ancestors.forEach(ancestor => {
                const summary = ancestor.querySelector(':scope > summary');
                const name = getSummaryName(summary);
                path.push({ name, level: 'details', id: ancestor.id });
            });
            if (element.tagName === 'DETAILS' && element.open) {
                 const summary = element.querySelector(':scope > summary');
                 const name = getSummaryName(summary);
                 path.push({ name, level: 'details', id: element.id });
            }
            updateAndRenderBreadcrumbs(path);
        };
    
        breadcrumbNav.addEventListener('click', (event) => {
            const target = event.target.closest('.breadcrumb-item');
            if (!target || !target.dataset.index) return;
            const breadcrumbIndex = parseInt(target.dataset.index, 10);
            const newBreadcrumbs = breadcrumbState.slice(0, breadcrumbIndex + 1);
            const targetCrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
            if (targetCrumb.level === 'home') {
                timelineContent.style.display = 'none'; searchResultsContainer.classList.add('hidden'); timelineSelection.style.display = 'grid'; subtitle.style.display = 'block'; searchBar.value = '';
            } else if (targetCrumb.level === 'section') {
                const sectionId = targetCrumb.id;
                const section = document.getElementById(sectionId);
                section?.querySelectorAll('details').forEach(d => d.open = false);
                section?.querySelectorAll('.dynasty-details, .event-details').forEach(d => d.classList.remove('hidden'));
            } else if (targetCrumb.level === 'details') {
                const detailId = targetCrumb.id;
                const detail = document.getElementById(detailId);
                detail?.querySelectorAll('details').forEach(d => d.open = false);
            }
            updateAndRenderBreadcrumbs(newBreadcrumbs);
        });
    
        // --- Build Search Index ---
        const buildSearchIndex = () => {
            searchIndex = [];
            allDetails.forEach((details, index) => {
                if (!details.id) { details.id = `details-search-target-${index}`; }
                const parentSection = details.closest('.timeline-section');
                const parentSectionTitle = parentSection?.querySelector('.main-section-title')?.textContent.split('(')[0].trim() || 'Unknown Section';
                const summaryElement = details.querySelector(':scope > summary');
                const title = getSummaryName(summaryElement);
                const content = details.querySelector(':scope > .content-panel')?.textContent || '';
                let founder = ''; let capital = '';
                if (summaryElement) {
                    const metaItems = summaryElement.querySelectorAll('.dynasty-meta .meta-item');
                    metaItems.forEach(item => {
                        const text = item.textContent || '';
                        if (text.includes('संस्थापक:')) { founder = text.replace('संस्थापक:', '').trim(); }
                        if (text.includes('राजधानी:')) { capital = text.replace('राजधानी:', '').trim(); }
                    });
                }
                const fullText = (title + ' ' + founder + ' ' + capital + ' ' + content).toLowerCase();
                searchIndex.push({ id: details.id, title: title, path: parentSectionTitle, fullText: fullText, element: details });
            });
        };
    
        // --- Search Function ---
        const performSearch = (query) => {
            if (!searchResultsContainer) return;
            searchResultsContainer.setAttribute('role', 'region'); searchResultsContainer.setAttribute('aria-live', 'polite'); searchResultsContainer.innerHTML = '';
            if (!query) {
                searchResultsContainer.classList.add('hidden');
                if (timelineContent.style.display !== 'block') { timelineSelection.style.display = 'grid'; subtitle.style.display = 'block'; }
                return;
            }
            timelineSelection.style.display = 'none'; subtitle.style.display = 'none'; timelineContent.style.display = 'none'; searchResultsContainer.classList.remove('hidden');
            const searchWords = query.split(/\s+/).filter(Boolean);
            const results = searchIndex.filter(item => searchWords.every(word => item.fullText.includes(word)));
            if (results.length === 0) { searchResultsContainer.innerHTML = `<div class="text-center text-gray-500 p-8" role="alert">कोई परिणाम नहीं मिला। (No results found.)</div>`; return; }
            const fragment = document.createDocumentFragment();
            const escapedWords = searchWords.map(word => word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
            const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
            results.forEach(result => {
                const resultElement = document.createElement('button');
                resultElement.className = 'search-result-item'; resultElement.dataset.targetId = result.id;
                const snippetText = result.fullText.substring(0, 200).replace(/\s+/g, ' ');
                const highlightedSnippet = snippetText.replace(regex, match => `<mark>${match}</mark>`);
                resultElement.innerHTML = `<div class="text-left w-full"><div class="search-result-path">${result.path}</div><div class="search-result-title">${result.title}</div><div class="search-result-snippet">...${highlightedSnippet}...</div></div>`;
                fragment.appendChild(resultElement);
            });
            searchResultsContainer.appendChild(fragment);
        };
    
        // --- Search Event Listeners ---
        searchBar.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer); const query = searchBar.value.trim().toLowerCase();
            searchDebounceTimer = setTimeout(() => { performSearch(query); }, 250);
        });
        searchResultsContainer.addEventListener('click', (event) => {
            const targetItem = event.target.closest('.search-result-item');
            if (!targetItem || !targetItem.dataset.targetId) return;
            navigateToElement(targetItem.dataset.targetId);
        });
    
        // --- Timeline Selection Logic ---
        timelineSelection.addEventListener('click', (event) => {
            const target = event.target.closest('.timeline-card');
            if (!target) return;
            const sectionId = target.dataset.target; const sectionToShow = document.getElementById(sectionId);
            if (sectionToShow) {
                timelineSelection.style.display = 'none'; timelineContent.style.display = 'block'; subtitle.style.display = 'none'; timelineSections.forEach(sec => sec.classList.add('hidden')); sectionToShow.classList.remove('hidden');
                const sectionTitle = target.querySelector('.timeline-title')?.textContent || 'Section';
                const sectionSubtitle = target.querySelector('.timeline-subtitle')?.textContent || '';
                const fullTitle = `${sectionTitle} (${sectionSubtitle})`;
                updateAndRenderBreadcrumbs([{ name: partData.breadcrumbHome, level: 'home' }, { name: fullTitle, level: 'section', id: sectionId }]);
            }
        });
    
        // --- King Color Coding Logic ---
        const applyKingColorCoding = () => {
            document.querySelectorAll('.dynasty-details').forEach(dynasty => {
                const contentPanel = dynasty.querySelector(':scope > .content-panel');
                if (!contentPanel) return;
                const kings = contentPanel.querySelectorAll(':scope > .king-details');
                const numKings = kings.length;
                kings.forEach((king, index) => {
                    if (index === numKings - 1 && numKings > 0) { king.classList.add('king-color-last');
                    } else { const colorIndex = (index % 12) + 1; king.classList.add(`king-color-${colorIndex}`); }
                });
            });
        };
    
        // --- Accordion Logic ---
        const setupAccordionLogic = () => {
            const MAX_PANEL_HEIGHT_VH = 80;
            const setPanelState = (panel, open) => {
                if (open) {
                    const scrollHeight = panel.scrollHeight; const maxAllowedHeight = (window.innerHeight * MAX_PANEL_HEIGHT_VH) / 100;
                    panel.style.maxHeight = `${maxAllowedHeight}px`;
                    panel.style.overflowY = scrollHeight > maxAllowedHeight ? 'auto' : 'hidden';
                } else { panel.style.maxHeight = null; panel.style.overflowY = 'hidden'; }
            };
            allDetails.forEach((details, i) => {
                const summary = details.querySelector(':scope > summary'); const contentPanel = details.querySelector(':scope > .content-panel');
                if (summary && contentPanel) { if (!contentPanel.id) { contentPanel.id = `content-panel-${i}`; } summary.setAttribute('aria-controls', contentPanel.id); }
                details.addEventListener('toggle', (event) => {
                    const target = event.target;
                    if (target.matches('.dynasty-details, .event-details')) {
                        const parentSection = target.closest('.timeline-section');
                        if (parentSection) {
                            parentSection.querySelectorAll('.dynasty-details, .event-details').forEach(other => {
                                if (other !== target) { target.open ? other.classList.add('hidden') : other.classList.remove('hidden'); }
                            });
                        }
                    }
                    if (contentPanel) { setPanelState(contentPanel, target.open); }
                    setTimeout(() => {
                        let parent = target.parentElement?.closest('details[open]');
                        while (parent) {
                            const parentContentPanel = parent.querySelector(':scope > .content-panel');
                            if (parentContentPanel) { setPanelState(parentContentPanel, true); }
                            parent = parent.parentElement?.closest('details[open]');
                        }
                    }, 0);
                    updateBreadcrumbsFromElement(target);
                });
            });
        };
    
        // --- Visual Timeline Bar ---
        const createVisualTimelines = (data) => {
            if (!data || Object.keys(data).length === 0) return;
            Object.entries(data).forEach(([sectionId, sectionData]) => {
                const section = document.getElementById(sectionId); const title = section?.querySelector('.main-section-title');
                if (!section || !title) return;
                const totalDuration = Math.abs(sectionData.start - sectionData.end);
                const container = document.createElement('div'); container.className = 'visual-timeline-container';
                const bar = document.createElement('div'); bar.className = 'visual-timeline-bar';
                sectionData.dynasties.forEach((dynasty) => {
                    const duration = Math.abs(dynasty.start - dynasty.end); const width = (duration / totalDuration) * 100;
                    const block = document.createElement('button');
                    block.className = 'timeline-block'; block.style.width = `${width}%`; block.style.backgroundColor = dynasty.color; block.textContent = dynasty.name; block.title = `${dynasty.name} (${duration} years)`; block.dataset.detailsId = dynasty.detailsId;
                    bar.appendChild(block);
                });
                container.appendChild(bar); title.after(container);
            });
            document.getElementById('timeline-content').addEventListener('click', (event) => {
                const target = event.target;
                if (target.classList.contains('timeline-block') && target.dataset.detailsId) {
                    const element = document.getElementById(target.dataset.detailsId);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        };
    
        // --- Inline Glossary ---
        const initializeGlossary = (data) => {
            const keyTerms = Object.keys(data); if (keyTerms.length === 0) return;
            const regex = new RegExp(`(${keyTerms.join('|')})`, 'g');
            document.querySelectorAll('.content-panel ul, .timeline-card .timeline-title').forEach(area => {
                const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
                const nodesToModify = [];
                while (walker.nextNode()) { if (walker.currentNode.parentElement?.tagName !== 'BUTTON') { nodesToModify.push(walker.currentNode); } }
                nodesToModify.forEach(node => {
                    if (node.nodeValue.match(regex)) {
                        const fragment = document.createDocumentFragment();
                        node.nodeValue.split(regex).forEach((part, index) => {
                            if (index % 2 === 1) {
                                const button = document.createElement('button');
                                button.className = 'key-term'; button.dataset.term = part; button.textContent = part; fragment.appendChild(button);
                            } else if (part) { fragment.appendChild(document.createTextNode(part)); }
                        });
                        node.parentNode.replaceChild(fragment, node);
                    }
                });
            });
            let popover = null; let lastFocusedTerm = null;
            const removePopover = () => {
                if (synth.speaking) synth.cancel();
                if (popover) { popover.remove(); popover = null; }
                if (lastFocusedTerm) { lastFocusedTerm.focus(); lastFocusedTerm = null; }
            };
            const handleTruncation = (popoverEl) => {
                const existingBtn = popoverEl.querySelector('.glossary-learn-more'); if (existingBtn) existingBtn.remove();
                const visibleContent = popoverEl.querySelector('.glossary-popover-content:not(.hidden)'); if (!visibleContent) return;
                visibleContent.classList.remove('is-truncated'); visibleContent.style.maxHeight = '';
                if (visibleContent.scrollHeight > visibleContent.clientHeight) {
                    visibleContent.classList.add('is-truncated');
                    const learnMoreBtn = document.createElement('button');
                    learnMoreBtn.className = 'glossary-learn-more'; learnMoreBtn.textContent = visibleContent.lang === 'hi' ? 'और पढ़ें ▼' : 'Learn More ▼';
                    popoverEl.querySelector('.glossary-popover-content-wrapper')?.after(learnMoreBtn);
                    learnMoreBtn.addEventListener('click', () => {
                        visibleContent.style.maxHeight = `${visibleContent.scrollHeight}px`; visibleContent.classList.remove('is-truncated'); learnMoreBtn.remove();
                    }, { once: true });
                }
            };
            const handlePopoverKeyDown = (event) => {
                if (event.key === 'Escape') { removePopover(); }
                if (event.key === 'Tab' && popover) { event.preventDefault(); popover.querySelector('.glossary-popover-close')?.focus(); }
            };
            const createPopover = (term, target) => {
                removePopover(); lastFocusedTerm = target; const termData = data[term]; if (!termData) return;
                popover = document.createElement('div');
                popover.className = 'glossary-popover'; popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-modal', 'true'); popover.setAttribute('aria-labelledby', 'popover-title-hi');
                popover.innerHTML = `
                    <div class="glossary-popover-header"><div class="glossary-titles"><h3 id="popover-title-hi" class="glossary-popover-title" lang="hi">${termData.title_hi}</h3><h3 id="popover-title-en" class="glossary-popover-title hidden" lang="en">${termData.title_en}</h3></div><div class="glossary-controls"><button class="read-aloud-btn" aria-label="Read aloud">${getPlayIcon()}</button><button class="language-toggle" aria-label="Switch to English">En</button><button class="glossary-popover-close" aria-label="बंद करें">&times;</button></div></div>
                    <div class="glossary-popover-content-wrapper"><div class="glossary-popover-content" lang="hi">${termData.definition_hi}</div><div class="glossary-popover-content hidden" lang="en">${termData.definition_en}</div></div>`;
                document.body.appendChild(popover);
                const targetRect = target.getBoundingClientRect(); const popoverRect = popover.getBoundingClientRect(); let top = targetRect.bottom + 8; let left = targetRect.left;
                if (top + popoverRect.height > window.innerHeight) { top = targetRect.top - popoverRect.height - 8; }
                if (left + popoverRect.width > window.innerWidth) { left = window.innerWidth - popoverRect.width - 8; }
                if (left < 8) { left = 8; }
                popover.style.top = `${top + window.scrollY}px`; popover.style.left = `${left + window.scrollX}px`;
                handleTruncation(popover); setTimeout(() => popover.classList.add('visible'), 10);
                const closeButton = popover.querySelector('.glossary-popover-close');
                const toggleBtn = popover.querySelector('.language-toggle');
                const readBtn = popover.querySelector('.read-aloud-btn');
                closeButton?.focus(); closeButton?.addEventListener('click', removePopover);
                readBtn?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const visibleTitle = popover.querySelector('.glossary-popover-title:not(.hidden)'); const visibleContent = popover.querySelector('.glossary-popover-content:not(.hidden)'); if (!visibleTitle || !visibleContent) return;
                    const lang = visibleContent.lang === 'hi' ? 'hi-IN' : 'en-US'; const textToRead = `${visibleTitle.textContent}. ${visibleContent.textContent}`;
                    readAloud(textToRead, lang, readBtn);
                });
                toggleBtn?.addEventListener('click', () => {
                    const isSwitchingToEnglish = popover.querySelector('.glossary-popover-content[lang="en"]').classList.contains('hidden');
                    popover.querySelectorAll('.glossary-popover-title, .glossary-popover-content').forEach(el => el.classList.toggle('hidden'));
                    if (isSwitchingToEnglish) {
                        toggleBtn.textContent = 'हि'; toggleBtn.setAttribute('aria-label', 'हिंदी में स्विच करें'); popover.setAttribute('aria-labelledby', 'popover-title-en');
                    } else {
                        toggleBtn.textContent = 'En'; toggleBtn.setAttribute('aria-label', 'Switch to English'); popover.setAttribute('aria-labelledby', 'popover-title-hi');
                    }
                    if (synth.speaking) synth.cancel(); handleTruncation(popover);
                });
                popover.addEventListener('keydown', handlePopoverKeyDown);
            };
            document.body.addEventListener('click', (event) => {
                const target = event.target;
                if (target.classList.contains('key-term') && target.dataset.term) { createPopover(target.dataset.term, target); } 
                else if (popover && !popover.contains(target)) { removePopover(); }
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popover) { removePopover(); } });
        };
        
        // --- Connections Hub ---
        const createConnectionsHubs = (data) => {
            if (!data || Object.keys(data).length === 0) return;
            Object.entries(data).forEach(([detailsId, connections]) => {
                const detailsElement = document.getElementById(detailsId);
                const contentPanel = detailsElement?.querySelector(':scope > .content-panel');
                if (!contentPanel) return;
                const hubContainer = document.createElement('div'); hubContainer.className = 'connections-hub';
                const title = document.createElement('h4'); title.className = 'connections-title'; title.textContent = 'Related Topics:';
                const tagsContainer = document.createElement('div'); tagsContainer.className = 'connections-tags';
                connections.forEach((conn) => {
                    const tag = document.createElement('button');
                    tag.className = 'connection-tag'; tag.textContent = conn.label; tag.dataset.targetId = conn.targetId;
                    tagsContainer.appendChild(tag);
                });
                hubContainer.appendChild(title); hubContainer.appendChild(tagsContainer); contentPanel.appendChild(hubContainer);
            });
            document.getElementById('timeline-content').addEventListener('click', (event) => {
                const target = event.target.closest('.connection-tag');
                if (target && target.dataset.targetId) { navigateToElement(target.dataset.targetId); }
            });
        };
    
        // --- Initial Load ---
        updateAndRenderBreadcrumbs([{ name: partData.breadcrumbHome, level: 'home' }]);
        injectReadAloudButtons();
        buildSearchIndex();
        setupAccordionLogic();
        applyKingColorCoding();
        createVisualTimelines(timelineData);
        initializeGlossary(glossaryData);
        createConnectionsHubs(connectionsData);

    } catch (error) {
        console.error("Failed to initialize the application:", error);
        if (mainContent) { mainContent.innerHTML = `<div class="text-center text-red-600 p-8" role="alert">Failed to load application data. Please try refreshing the page.</div>`; }
    } finally {
        if (loader) {
            loader.classList.add('hidden');
            loader.addEventListener('transitionend', () => loader.remove());
        }
        if (mainContent) { mainContent.classList.remove('hidden'); }
    }
});