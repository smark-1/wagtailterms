// Not a real React component – just creates the entities as soon as it is rendered.
class TermSource extends window.React.Component {
    state = {
        terms: [],
        selectedTags: new Set(),
        isModalVisible: false,
        tagPage: 1,
        isLoadingTags: false,
        hasMoreTags: true,
        currentPage: 1,
        hasMoreTerms: true,
        isLoadingTerms: false
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
                                                    <div id="tag-list" class="w-field__tags" style="min-height: 400px; max-height: 60vh; overflow-y: auto;"></div>
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
        
        // Update all matching checkboxes with the same value
        document.querySelectorAll(`.tag-checkbox[value="${tag.name}"]`).forEach(checkbox => {
            checkbox.checked = selectedTags.has(tag.name);
        });
        
        this.setState({ selectedTags }, () => {
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

    searchTags = (page = 1, append = false) => {
        if (this.state.isLoadingTags || (!this.state.hasMoreTags && page > 1)) return;

        this.setState({ isLoadingTags: true });
        
        fetch(`${WAGTAIL_TERM_PATH}tags/?page=${page}`)
            .then(response => response.json())
            .then(data => {
                const tagListDiv = document.getElementById("tag-list");
                if (!tagListDiv) return;

                const tags = data.tags || data;
                const hasMore = data.hasMore !== undefined ? data.hasMore : true;
                
                // Generate HTML for all tags, ensuring selected state is preserved
                const tagsHtml = tags.map(tag => {
                    const isChecked = this.state.selectedTags.has(tag.name);
                    return this.createTagCheckboxHtml(tag, isChecked);
                }).join('');

                if (append) {
                    tagListDiv.insertAdjacentHTML('beforeend', tagsHtml);
                } else {
                    tagListDiv.innerHTML = tagsHtml;
                }

                // We don't need to add click event listeners here anymore since we're using onclick in the HTML

                this.setState({ 
                    tagPage: page,
                    isLoadingTags: false,
                    hasMoreTags: hasMore
                });
            })
            .catch(error => {
                console.error('Error fetching tags:', error);
                this.setState({ isLoadingTags: false });
            });
    }

    handleTagScroll = (e) => {
        const element = e.target;
        if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
            this.searchTags(this.state.tagPage + 1, true);
        }
    }

    buildTermsUrl = (page, searchQuery) => {
        let url = `${WAGTAIL_TERM_PATH}?page=${page}`;
        if (searchQuery) {
            url += `&q=${searchQuery}`;
        }
        if (this.state.selectedTags.size > 0) {
            const tags = Array.from(this.state.selectedTags);
            url += tags.map(tag => `&tags[]=${encodeURIComponent(tag)}`).join('');
        }
        return url;
    }

    renderTermRow = (item) => `
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
    `

    renderPaginationControls = (data) => {
        const totalCount = data.count;
        const totalPages = data.total_pages;
        const currentPage = data.current_page;
        const startItem = ((currentPage - 1) * 3) + 1; // Using backend's page size of 3
        const endItem = Math.min(startItem + this.state.terms.length - 1, totalCount);
        
        // Only show pagination controls if there's more than one page
        if (totalPages <= 1) {
            return `
            <div style="text-align: center; margin-top: 20px;">
                <div style="text-align: center; line-height: 18px; padding: 0 10px;">
                    <div>Showing ${this.state.terms.length} of ${totalCount} terms</div>
                </div>
            </div>
            `;
        }
        
        return `
        <div style="text-align: center; margin-top: 20px;">
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 10px;">
                <button type="button" 
                    class="button button-secondary" 
                    onclick="window.lastTermSource.handlePageChange(${currentPage - 1})"
                    ${!data.previous || this.state.isLoadingTerms ? 'disabled' : ''}>
                    Previous
                </button>
                <div style="text-align: center; line-height: 18px; padding: 0 10px;">
                    <div>Showing ${this.state.terms.length} of ${totalCount} terms</div>
                    <div>Page ${currentPage} of ${totalPages}</div>
                </div>
                <button type="button" 
                    class="button button-secondary" 
                    onclick="window.lastTermSource.handlePageChange(${currentPage + 1})"
                    ${!data.next || this.state.isLoadingTerms ? 'disabled' : ''}>
                    Next
                </button>
            </div>
        </div>
        `
    }

    renderTermsTable = (terms) => `
        <table class="listing" style="width: 100%;">
            <thead>
                <tr class="table-headers">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--w-color-border-field); width: 20%;">Term</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--w-color-border-field); width: 50%;">Definition</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid var(--w-color-border-field); width: 30%;">Tags</th>
                </tr>
            </thead>
            <tbody>
                ${terms.map(item => this.renderTermRow(item)).join('')}
            </tbody>
        </table>
    `

    updateTermsList = (data, append) => {
        const frame = document.getElementById("term-selector-popup-search-buttons-frame");
        
        this.setState({ 
            terms: data.results,
            hasMoreTerms: data.next !== null,
            isLoadingTerms: false
        }, () => {
            const content = data.count > 0 
                ? this.renderTermsTable(data.results) + this.renderPaginationControls(data)
                : '<p style="padding: 8px; color: var(--w-color-text-label);">No terms found</p>';
            
            frame.innerHTML = content;
        });
    }

    handleSearchError = (error) => {
        console.error('Error fetching terms:', error);
        const frame = document.getElementById("term-selector-popup-search-buttons-frame");
        frame.innerHTML = '<p style="color: red; padding: 8px;">Error loading terms</p>';
        this.setState({ isLoadingTerms: false });
    }

    getSearchTerms = (page = 1, append = false) => {
        // Don't fetch if we're already loading
        if (this.state.isLoadingTerms) return;

        const searchBox = document.getElementById("term-selector-popup-search-box");
        this.setState({ isLoadingTerms: true });
        
        fetch(this.buildTermsUrl(page, searchBox.value))
            .then(response => response.json())
            .then(data => {
                // Update page state before updating the list
                this.setState({ currentPage: page }, () => {
                    this.updateTermsList(data, append);
                });
            })
            .catch(this.handleSearchError);
    }

    handlePageChange = (page) => {
        if (page < 1 || this.state.isLoadingTerms) {
            return;
        }
        this.getSearchTerms(page, false);
    }

    handleSearchInput = () => {
        // Reset pagination when search input changes
        this.setState({
            currentPage: 1,
            terms: [],
            hasMoreTerms: true
        }, () => {
            this.getSearchTerms(1, false);
        });
    }

    loadInitialTags = () => {
        this.setState({ tagPage: 1, hasMoreTags: true }, () => {
            this.searchTags(1, false);
        });
    }

    createTagCheckboxHtml = (tag, isChecked) => {
        return `
            <div class="tag-item" style="display: flex; align-items: center; padding: 4px 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; width: 100%;">
                    <input type="checkbox" 
                           class="tag-checkbox" 
                           value="${tag.name}"
                           ${isChecked ? 'checked' : ''}
                           onclick="window.lastTermSource.handleTagClick(event)">
                    <span>${tag.name}</span>
                    <span style="color: var(--w-color-text-label); margin-left: auto;">(${tag.count})</span>
                </label>
            </div>
        `;
    }

    handleTagClick = (event) => {
        event.stopPropagation();
        const checkbox = event.target;
        this.handleTagSelect({ name: checkbox.value });
    }

    initializePopup = () => {
        const searchClose = document.getElementById("term-selector-popup-close");
        if (searchClose) {
            searchClose.onclick = this.handleClose;
        }

        const searchBox = document.getElementById("term-selector-popup-search-box");

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
            searchBox.onkeyup = this.handleSearchInput;
        }

        const tagListDiv = document.getElementById("tag-list");
        if (tagListDiv) {
            tagListDiv.addEventListener('scroll', this.handleTagScroll);
        }

        // Run initial searches
        this.loadInitialTags();
        this.getSearchTerms(1, false);
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
        // Clean up modal and event listeners when component unmounts
        const modal = document.getElementById('term-selector-modal');
        const tagListDiv = document.getElementById("tag-list");
        if (tagListDiv) {
            tagListDiv.removeEventListener('scroll', this.handleTagScroll);
        }
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