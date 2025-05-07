// create popup to choose the term. The entire page uses the same popup. This makes it easier to select by id
const termPopup = new Popup({
    id: "term-selector-popup",
    title: "Choose term",
    allowClose: false,
    backgroundColor:'var(--w-color-surface-field)',
    textColor:'var(--w-text-context)',
    titleColor:'var(--w-text-label)',
    borderColor:'var(--w-color-border-furniture)',
    content: `<div style="position: relative;">
    <button style="position: absolute;top:-80px;right:0;background-color: var(--w-color-surface-field)" id="term-selector-popup-close">X</button>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <div style="flex: 1;">
            <label for="term-selector-popup-search-box">Find Term</label><br>
            <input type="search" name="fname" id="term-selector-popup-search-box" style="width: 100%; width: -moz-available; width: -webkit-fill-available; width: fill-available;">
        </div>
        <div style="width: 200px; position: relative;">
            <label for="term-selector-popup-tag-filter">Filter by Tags</label><br>
            <input type="text" id="term-selector-popup-tag-filter" placeholder="Search tags..." style="width: 100%; height: 36px;">
            <div id="tag-selected-list" style="margin-top: 5px; max-height: 60px; overflow-y: auto; font-size: 12px;"></div>
            <div id="tag-suggestions" style="display: none; position: absolute; width: 100%; max-height: 200px; overflow-y: auto; background: var(--w-color-surface-field); border: 1px solid var(--w-color-border-furniture); border-top: none; z-index: 1000;"></div>
        </div>
    </div>
    <div id="term-selector-popup-search-buttons-frame"></div>
    </div>
    `,
});

// Not a real React component – just creates the entities as soon as it is rendered.
class TermSource extends window.React.Component {
    state = {
        terms: [],
        selectedTags: new Set(),
        tagSuggestions: []
    }

    // close window and cancel user adding a term
    handleClose = (e) => {
        const {onComplete, editorState} = this.props;
        termPopup.hide()

        // Draftail requires that must set editor state
        onComplete(editorState);
    }

    handleSetTerm = (e) => {
        // get the term id
        const termId = parseInt(e.target.dataset.termId)
        // get the term from the id
        const term = this.state.terms.find((term) => term.id === termId)

        // close the term popup once term is found
        termPopup.hide();

        const {editorState, entityType, onComplete} = this.props;
        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();

        // get currently selected text
        const anchorKey = selection.getAnchorKey();
        const start = selection.getStartOffset();
        const end = selection.getEndOffset()
        const current_selected_text = content.getBlockForKey(anchorKey).getText().slice(start, end)

        // get the searchbox and insert the value of the highlighted text
        const searchBox = document.getElementById("term-selector-popup-search-box");
        searchBox.value = current_selected_text;

        // Uses the Draft.js API to create a new entity with the right data.
        const contentWithEntity = content.createEntity(
            entityType.type,
            'MUTABLE',
            {text: current_selected_text, term: term, id: this.state.id, tags: term.tags},
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
        
        this.setState({ selectedTags });
        this.updateSelectedTagsDisplay();
        this.getSearchTerms();
        
        // Clear search input and show updated suggestions
        const tagInput = document.getElementById("term-selector-popup-tag-filter");
        tagInput.value = '';
        this.loadInitialTags();
    }

    updateSelectedTagsDisplay = () => {
        const selectedList = document.getElementById("tag-selected-list");
        selectedList.innerHTML = Array.from(this.state.selectedTags).map(tag => `
            <div style="display: inline-block; background: var(--w-color-surface-button-default); color: var(--w-color-text-button); 
                        padding: 2px 6px; margin: 2px; border-radius: 4px; cursor: pointer;"
                 onclick="this.remove(); window.lastTermSource.handleTagSelect({name: '${tag}'})">
                ${tag} ✕
            </div>
        `).join('');
    }

    searchTags = (query) => {
        fetch(`${WAGTAIL_TERM_PATH}tags/?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(tags => {
                const suggestionsDiv = document.getElementById("tag-suggestions");
                // Filter out already selected tags
                const availableTags = tags.filter(tag => !this.state.selectedTags.has(tag.name));
                
                if (availableTags.length > 0) {
                    suggestionsDiv.innerHTML = availableTags
                        .map(tag => `
                            <div class="tag-suggestion" style="padding: 8px; cursor: pointer;" data-tag-name="${tag.name}">
                                ${tag.name} <small>(${tag.count})</small>
                            </div>
                        `)
                        .join('');
                    suggestionsDiv.style.display = "block";

                    // Add click handlers for suggestions
                    const suggestions = suggestionsDiv.getElementsByClassName("tag-suggestion");
                    Array.from(suggestions).forEach(suggestion => {
                        suggestion.addEventListener('mouseover', () => {
                            suggestion.style.backgroundColor = 'var(--w-color-surface-button-hover)';
                        });
                        suggestion.addEventListener('mouseout', () => {
                            suggestion.style.backgroundColor = 'var(--w-color-surface-field)';
                        });
                        suggestion.addEventListener('click', () => this.handleTagSelect({
                            name: suggestion.dataset.tagName
                        }));
                    });
                } else {
                    suggestionsDiv.style.display = "none";
                }
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
                this.setState({ terms: data });

                frame.innerHTML = "";
                for (const item of data) {
                    const button_style = 'background-color: var(--w-color-surface-button-default); color:var(--w-color-text-button); margin: 5px;'
                    const update_hover_colors = "onMouseOver=\"this.style.backgroundColor='var(--w-color-surface-button-hover)'\" onMouseOut=\"this.style.backgroundColor='var(--w-color-surface-button-default)'\""
                    const tags = item.tags && item.tags.length > 0 
                        ? `<small style="display: block; opacity: 0.8;">${item.tags.join(', ')}</small>` 
                        : '';
                    frame.innerHTML += `
                        <button data-term-id="${item.id}" style="${button_style}" ${update_hover_colors}>
                            ${item.term}${tags}
                        </button>`
                }
                for (const button of frame.children) {
                    button.onclick = this.handleSetTerm
                }
            })
    };

    loadInitialTags = () => {
        fetch(`${WAGTAIL_TERM_PATH}tags/`)
            .then(response => response.json())
            .then(tags => {
                const suggestionsDiv = document.getElementById("tag-suggestions");
                // Filter out already selected tags
                const availableTags = tags.filter(tag => !this.state.selectedTags.has(tag.name));
                
                if (availableTags.length > 0) {
                    suggestionsDiv.innerHTML = availableTags
                        .slice(0, 20)
                        .map(tag => `
                            <div class="tag-suggestion" style="padding: 8px; cursor: pointer;" data-tag-name="${tag.name}">
                                ${tag.name} <small>(${tag.count})</small>
                            </div>
                        `)
                        .join('');

                    // Add click handlers for suggestions
                    const suggestions = suggestionsDiv.getElementsByClassName("tag-suggestion");
                    Array.from(suggestions).forEach(suggestion => {
                        suggestion.addEventListener('mouseover', () => {
                            suggestion.style.backgroundColor = 'var(--w-color-surface-button-hover)';
                        });
                        suggestion.addEventListener('mouseout', () => {
                            suggestion.style.backgroundColor = 'var(--w-color-surface-field)';
                        });
                        suggestion.addEventListener('click', () => this.handleTagSelect({
                            name: suggestion.dataset.tagName
                        }));
                    });
                } else {
                    suggestionsDiv.style.display = "none";
                }
            });
    }

    componentDidMount() {
        // Store reference for tag chip removal
        window.lastTermSource = this;
        
        // open the term selector popup
        termPopup.show();

        // make editor not freeze on close - use custom close button so have to set on click method for it
        const searchClose = document.getElementById("term-selector-popup-close");
        searchClose.onclick = this.handleClose;

        // get the selected text
        const searchBox = document.getElementById("term-selector-popup-search-box");
        const tagInput = document.getElementById("term-selector-popup-tag-filter");
        const {editorState} = this.props;
        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();
        const anchorKey = selection.getAnchorKey();
        const start = selection.getStartOffset();
        const end = selection.getEndOffset()
        const current_selected_text = content.getBlockForKey(anchorKey).getText().slice(start, end)

        // set the searchbox text to selected text
        searchBox.value = current_selected_text;

        // Handle tag input
        let tagDebounceTimer;
        tagInput.addEventListener('focus', () => {
            if (!tagInput.value) {
                this.loadInitialTags();
                document.getElementById("tag-suggestions").style.display = "block";
            }
        });

        tagInput.addEventListener('input', (e) => {
            clearTimeout(tagDebounceTimer);
            if (e.target.value === '') {
                this.loadInitialTags();
                document.getElementById("tag-suggestions").style.display = "block";
            } else {
                tagDebounceTimer = setTimeout(() => {
                    this.searchTags(e.target.value);
                    document.getElementById("tag-suggestions").style.display = "block";
                }, 300);
            }
        });

        // Close tag suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#term-selector-popup-tag-filter') && 
                !e.target.closest('#tag-suggestions')) {
                document.getElementById("tag-suggestions").style.display = "none";
            }
        });

        // update search while the user types
        searchBox.onkeyup = this.getSearchTerms;

        // run the search initially and load tags without showing them
        this.loadInitialTags();
        this.getSearchTerms();
    }

    render() {
        // always returns null
        return null
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