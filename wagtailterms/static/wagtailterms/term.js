// Not a real React component – just creates the entities as soon as it is rendered.
class TermSource extends window.React.Component {
    state = {
        terms: [],
        selectedTags: new Set(),
        tagSuggestions: [],
        isModalVisible: false
    }

    modalContent = `
    <div id="term-selector-modal" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true" style="display: none;">
        <div class="modal-dialog">
            <div class="modal-content">
                <button type="button" class="button close button--icon text-replace w-dialog__close-button" id="term-selector-popup-close">
                    <svg class="icon icon-cross" aria-hidden="true"><use href="#icon-cross"></use></svg>
                    Close
                </button>
                <div class="modal-body">
                    <header class="w-header w-header--merged">
                        <div class="row">
                            <div class="left">
                                <div class="col">
                                    <h1 class="w-header__title" id="header-title">
                                        <svg class="icon icon-term w-header__glyph" aria-hidden="true">
                                            <use href="#icon-doc-full-inverse"></use>
                                        </svg>
                                        Choose a term
                                    </h1>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div class="w-tabs" data-tabs>
                        <div class="w-tabs__wrapper w-overflow-hidden">
                            <div role="tablist" class="w-tabs__list w-w-full">
                                <a id="tab-label-search" href="#tab-search" class="w-tabs__tab" role="tab" aria-selected="true" aria-controls="tab-search">
                                    Search
                                </a>
                            </div>
                        </div>

                        <div class="tab-content">
                            <section id="tab-search" class="w-tabs__panel" role="tabpanel" aria-labelledby="tab-label-search">
                                <form class="w-panel w-panel--search" novalidate>
                                    <div style="display: flex; gap: 20px;">
                                        <div class="w-field__wrapper" style="flex: 1;">
                                            <div class="w-field w-field--char_field w-field--text_input" data-field>
                                                <label class="w-field__label" for="term-selector-popup-search-box">
                                                    Search term
                                                </label>
                                                <div class="w-field__input">
                                                    <input type="text" id="term-selector-popup-search-box" class="w-field__textinput" placeholder="Search">
                                                </div>
                                            </div>
                                            <div id="term-selector-popup-search-buttons-frame" class="listing results" style="min-height: 400px; max-height: 60vh; overflow-y: auto; margin-top: 10px;"></div>
                                        </div>

                                        <div class="w-field__wrapper" style="flex: 0 0 300px; max-width: 300px;">
                                            <div class="w-field w-field--tag_field w-field--admin_tag_widget" data-field>
                                                <label class="w-field__label">Filter by Tags</label>
                                                <div class="w-field__input">
                                                    <input type="text" id="term-selector-popup-tag-filter" class="w-field__textinput" placeholder="Search tags...">
                                                    <div id="tag-list" class="w-field__tags" style="min-height: 400px; max-height: 60vh; overflow-y: auto; margin-top: 8px;"></div>
                                                </div>
                                            </div>
                                        </div>
                                </form>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    showModal = () => {
        const modal = document.getElementById('term-selector-modal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('in');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            this.initializePopup();
        }
    }

    hideModal = () => {
        const modal = document.getElementById('term-selector-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('in');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        }
    }

    // close window and cancel user adding a term
    handleClose = (e) => {
        const {onComplete, editorState} = this.props;
        this.hideModal();
        // Draftail requires that must set editor state
        onComplete(editorState);
    }

    handleSetTerm = (e) => {
        // get the term id from the clicked row
        const rowElement = e.target.closest('tr');
        if (!rowElement) {
            console.error('Row element not found');
            return;
        }

        const termId = parseInt(rowElement.dataset.termId);
        if (isNaN(termId)) {
            console.error('Invalid term ID:', rowElement.dataset.termId);
            return;
        }

        // get the term from the id
        const term = this.state.terms.find((t) => t.id === termId);
        if (!term) {
            console.error('Term not found:', termId);
            return;
        }

        const {editorState, entityType, onComplete} = this.props;
        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();

        // get currently selected text
        const anchorKey = selection.getAnchorKey();
        const start = selection.getStartOffset();
        const end = selection.getEndOffset();
        const current_selected_text = content.getBlockForKey(anchorKey).getText().slice(start, end);

        // Uses the Draft.js API to create a new entity with the right data.
        const contentWithEntity = content.createEntity(
            entityType.type,
            'MUTABLE',
            {text: current_selected_text, term: term, id: term.id, tags: term.tags},
        );

        // add text in position of the old text. If no text was selected put the text of the term.
        const newContent = window.DraftJS.Modifier.replaceText(
            content,
            selection,
            current_selected_text.length === 0 ? term.term : current_selected_text,
            null,
            contentWithEntity.getLastCreatedEntityKey(),
        );

        // create the new editor state with the new entity
        const nextState = window.DraftJS.EditorState.push(
            editorState,
            newContent,
            'insert-characters',
        );

        this.hideModal();

        // update the editor to show the changes
        onComplete(nextState);
    }

    handleTagSelect = (tag) => {
        const selectedTags = new Set(this.state.selectedTags);
        if (selectedTags.has(tag.name)) {
            selectedTags.delete(tag.name);
        } else {
            selectedTags.add(tag.name);
        }
        
        this.setState({ selectedTags }, () => {
            this.loadInitialTags();
            this.getSearchTerms();
        });
    }

    updateSelectedTagsDisplay = () => {
        const selectedList = document.getElementById("tag-selected-list");
        selectedList.innerHTML = Array.from(this.state.selectedTags).map(tag => `
            <div style="display: inline-flex; align-items: center; gap: 6px; background: green; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 0.85em; border: 1px solid var(--w-color-border-button); transition: background-color 0.2s ease;">
                <span style="color: var(--w-color-text-button);">${tag}</span>
                <span style="color: var(--w-color-text-button); cursor: pointer; opacity: 0.8;" 
                      onmouseover="this.style.opacity = '1'" 
                      onmouseout="this.style.opacity = '0.8'"
                      onclick="window.lastTermSource.handleTagSelect({name: '${tag}'})">✕</span>
            </div>
        `).join('');
    }

    searchTags = (query) => {
        fetch(`${WAGTAIL_TERM_PATH}tags/?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(tags => {
                const tagListDiv = document.getElementById("tag-list");
                const allTags = tags.sort((a, b) => a.name.localeCompare(b.name));
                
                // Always show selected tags at the top
                const selectedTagsHtml = Array.from(this.state.selectedTags)
                    .map(tagName => {
                        const tag = allTags.find(t => t.name === tagName) || { name: tagName, count: 0 };
                        return this.createTagCheckboxHtml(tag, true);
                    })
                    .join('');

                // Filter unselected tags based on search query
                const unselectedTagsHtml = allTags
                    .filter(tag => 
                        !this.state.selectedTags.has(tag.name) && 
                        tag.name.toLowerCase().includes(query.toLowerCase())
                    )
                    .map(tag => this.createTagCheckboxHtml(tag, false))
                    .join('');

                tagListDiv.innerHTML = selectedTagsHtml + unselectedTagsHtml;

                // Add event listeners to checkboxes
                const checkboxes = tagListDiv.getElementsByClassName('tag-checkbox');
                Array.from(checkboxes).forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        this.handleTagSelect({ name: e.target.value });
                    });
                });
            });
    }

    // function to search for terms that match the search text and selected tag
    getSearchTerms = () => {
        const searchBox = document.getElementById("term-selector-popup-search-box");
        const frame = document.getElementById("term-selector-popup-search-buttons-frame");
        
        // Build URL with search and tag parameters
        let url = `${WAGTAIL_TERM_PATH}?q=${searchBox.value}`;
        if (this.state.selectedTags.size > 0) {
            const tags = Array.from(this.state.selectedTags);
            url += tags.map(tag => `&tags[]=${encodeURIComponent(tag)}`).join('');
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Store the terms in state before rendering table
                this.setState({ terms: data }, () => {
                    // Create table structure
                    const tableHtml = `
                        <table class="listing" style="width: 100%;">
                            <thead>
                                <tr class="table-headers">
                                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--w-color-border-field); width: 20%;">Term</th>
                                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--w-color-border-field); width: 50%;">Definition</th>
                                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--w-color-border-field); width: 30%;">Tags</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map(item => `
                                    <tr class="term-row" 
                                        data-term-id="${item.id}"
                                        style="cursor: pointer; transition: background-color 0.2s ease;"
                                        onmouseover="this.style.backgroundColor = 'var(--w-color-surface-button-hover)'"
                                        onmouseout="this.style.backgroundColor = ''"
                                        onclick="window.lastTermSource.handleSetTerm(event)">
                                        <td style="padding: 8px; border-bottom: 1px solid var(--w-color-border-field);">
                                            <div style="font-weight: 500;">${item.term}</div>
                                        </td>
                                        <td style="padding: 8px; border-bottom: 1px solid var(--w-color-border-field); color: var(--w-color-text-context);">
                                            ${item.definition ? 
                                                (item.definition.length > 150 ? 
                                                    item.definition.substring(0, 150) + '...' : 
                                                    item.definition) : 
                                                ''}
                                        </td>
                                        <td style="padding: 8px; border-bottom: 1px solid var(--w-color-border-field);">
                                            ${item.tags && item.tags.length > 0 
                                                ? item.tags.map(tag => 
                                                    `<span style="display: inline-block; font-size: 0.85em; color: var(--w-color-text-label); background: var(--w-color-surface-field-inactive); padding: 2px 6px; border-radius: 4px; margin: 2px;">${tag}</span>`
                                                ).join(' ')
                                                : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>`;

                    frame.innerHTML = data.length > 0 
                        ? tableHtml 
                        : '<p style="padding: 8px; color: var(--w-color-text-label);">No terms found</p>';
                });
            })
            .catch(error => {
                console.error('Error fetching terms:', error);
                frame.innerHTML = '<p style="color: red; padding: 8px;">Error loading terms</p>';
            });
    };

    loadInitialTags = () => {
        fetch(`${WAGTAIL_TERM_PATH}tags/`)
            .then(response => response.json())
            .then(tags => {
                const tagListDiv = document.getElementById("tag-list");
                // Get all available tags and sort them
                const allTags = tags.sort((a, b) => a.name.localeCompare(b.name));
                
                // First show selected tags
                const selectedTagsHtml = Array.from(this.state.selectedTags)
                    .map(tagName => {
                        const tag = allTags.find(t => t.name === tagName) || { name: tagName, count: 0 };
                        return this.createTagCheckboxHtml(tag, true);
                    })
                    .join('');

                // Then show unselected tags that match the current search results
                const unselectedTagsHtml = allTags
                    .filter(tag => !this.state.selectedTags.has(tag.name))
                    .map(tag => this.createTagCheckboxHtml(tag, false))
                    .join('');

                tagListDiv.innerHTML = selectedTagsHtml + unselectedTagsHtml;

                // Add event listeners to checkboxes
                const checkboxes = tagListDiv.getElementsByClassName('tag-checkbox');
                Array.from(checkboxes).forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        this.handleTagSelect({ name: e.target.value });
                    });
                });
            });
    }

    createTagCheckboxHtml = (tag, isChecked) => {
        return `
            <div class="tag-item" style="display: flex; align-items: center; padding: 4px 8px; ${isChecked ? 'background: var(--w-color-surface-button-hover);' : ''}">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; width: 100%;">
                    <input type="checkbox" 
                           class="tag-checkbox" 
                           value="${tag.name}" 
                           ${isChecked ? 'checked' : ''}>
                    <span>${tag.name}</span>
                    <span style="color: var(--w-color-text-label); margin-left: auto;">(${tag.count})</span>
                </label>
            </div>
        `;
    }

    initializePopup = () => {
        const searchClose = document.getElementById("term-selector-popup-close");
        if (searchClose) {
            searchClose.onclick = this.handleClose;
        }

        const searchBox = document.getElementById("term-selector-popup-search-box");
        const tagInput = document.getElementById("term-selector-popup-tag-filter");

        if (searchBox) {
            // Get the selected text
            const {editorState} = this.props;
            const content = editorState.getCurrentContent();
            const selection = editorState.getSelection();
            const anchorKey = selection.getAnchorKey();
            const start = selection.getStartOffset();
            const end = selection.getEndOffset();
            const current_selected_text = content.getBlockForKey(anchorKey).getText().slice(start, end);

            searchBox.value = current_selected_text;
            searchBox.onkeyup = this.getSearchTerms;
        }

        if (tagInput) {
            let tagDebounceTimer;
            tagInput.addEventListener('focus', () => {
                if (!tagInput.value) {
                    this.loadInitialTags();
                    const suggestions = document.getElementById("tag-suggestions");
                    if (suggestions) {
                        suggestions.style.display = "block";
                    }
                }
            });

            tagInput.addEventListener('input', (e) => {
                clearTimeout(tagDebounceTimer);
                if (e.target.value === '') {
                    this.loadInitialTags();
                    const suggestions = document.getElementById("tag-suggestions");
                    if (suggestions) {
                        suggestions.style.display = "block";
                    }
                } else {
                    tagDebounceTimer = setTimeout(() => {
                        this.searchTags(e.target.value);
                        const suggestions = document.getElementById("tag-suggestions");
                        if (suggestions) {
                            suggestions.style.display = "block";
                        }
                    }, 300);
                }
            });
        }

        // Close tag suggestions when clicking outside
        document.addEventListener('click', (e) => {
            const suggestions = document.getElementById("tag-suggestions");
            if (suggestions && 
                !e.target.closest('#term-selector-popup-tag-filter') && 
                !e.target.closest('#tag-suggestions')) {
                suggestions.style.display = "none";
            }
        });

        // Run initial searches
        this.loadInitialTags();
        this.getSearchTerms();
    }

    componentDidMount() {
        // Store reference for tag chip removal
        window.lastTermSource = this;
        
        // Insert modal into the DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = this.modalContent;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Show the modal
        this.showModal();
    }

    componentWillUnmount() {
        // Clean up modal when component unmounts
        const modal = document.getElementById('term-selector-modal');
        if (modal) {
            modal.remove();
        }
    }

    render() {
        return null;
    }
}


// function based components don't work
// this is a term item that shows up in the editor
class Term extends window.React.Component{
    constructor(props) {
        super(props);
        // get the data and the term
        const {entityKey, contentState} = props;
        const data = contentState.getEntity(entityKey).getData();
        this.state = {
            // generate a unique string to this component so the tool tip will be applied to only this term
            randomString:(Math.random() + 1).toString(36).substring(7),
            term:data.term
        }
    }

    componentDidMount(){
        tippy(document.getElementById(`term_${this.state.term.id}_${this.state.randomString}`),
        {
            content: `<h4 style="color: white">${this.state.term.term}</h4>
                 ${this.state.term.tags && this.state.term.tags.length > 0 ? 
                   `<p><small>Tags: ${this.state.term.tags.join(', ')}</small></p>` : ''}
                 <p>${this.state.term.definition}</p>`,
            allowHTML: true,
            interactive: true,
            appendTo: () => document.body, theme: 'light-border'
        });
    }

    render(){
        // this is the jsx equivalent. jsx is not available since this is using the build system of wagtail which only gives access to React.
        // cannot use the build system of the rest of the project since it doesn't load at
        // the correct time and makes the editor crash when using this entity
        // return <span id={`term_${data.term.id}_${randomString}`} style={
        //         {
        //             textDecorationLine: 'underline',
        //             textDecorationColor: "green",
        //             textDecorationThickness: 3,
        //             color: 'green'
        //         }
        //     }>
        //     {props.children}
        // </span>

        // converting a string to camel case so that the same styles can be used in the editor and the frontend with no duplication.
        // this helps when changing the style setting so that it looks the same in the admin and frontend.
        // https://stackoverflow.com/a/42124821
        const convertToCamel=(string)=>{
            const camelize = (string) =>  string.replace(/-([a-z])/gi,(s, group) =>  group.toUpperCase());
            const style2object = (style) => style.split(';').filter(s => s.length)
                .reduce((a, b) => {
                    const keyValue = b.split(':');
                    a[camelize(keyValue[0])] = keyValue[1] ;
                    return a;
                } ,{});
            return style2object(string)
        };

        return window.React.createElement("span", {
            id: `term_${this.state.term.id}_${this.state.randomString}`,
            // WAGTAIL_TERM_STYLE is injected in wagtail_hooks file. This is the style set for the term as a string.
            style:convertToCamel(WAGTAIL_TERM_STYLE),
            children: this.props.children
    })
    }
}

window.draftail.registerPlugin({
    type: 'TERM',
    source: TermSource,
    decorator: Term,
}, 'entityTypes');