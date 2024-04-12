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
    <label for="term-selector-popup-search-box">Find Term</label><br>
    <input type="search" name="fname" id="term-selector-popup-search-box" style="width: 100%; width: -moz-available; width: -webkit-fill-available; width: fill-available;">
    <div id="term-selector-popup-search-buttons-frame"></div>
    </div>
    `,
});



// Not a real React component – just creates the entities as soon as it is rendered.
class TermSource extends window.React.Component {
    state = {terms: []}

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
            {text: current_selected_text, term: term, id: this.state.id},
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

    componentDidMount() {
        // open the term selector popup
        termPopup.show();

        // make editor not freeze on close - use custom close button so have to set on click method for it
        const searchClose = document.getElementById("term-selector-popup-close");
        searchClose.onclick = this.handleClose;

        // get the selected text
        const searchBox = document.getElementById("term-selector-popup-search-box");
        const frame = document.getElementById("term-selector-popup-search-buttons-frame");
        const {editorState, entityType, onComplete} = this.props;
        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();
        const anchorKey = selection.getAnchorKey();
        const start = selection.getStartOffset();
        const end = selection.getEndOffset()
        const current_selected_text = content.getBlockForKey(anchorKey).getText().slice(start, end)

        // function to search for terms that match the search text. All matches get added as a button in popup.
        // if button is clicked will set the term to button
        const getSearchTerms = () => {
            fetch(`${WAGTAIL_TERM_PATH}?q=${searchBox.value}`)
                .then(response => response.json())
                .then(data => {
                    this.setState({terms: data})
                    frame.innerHTML = "";
                    for (const item of data) {
                        const button_style = 'background-color: var(--w-color-surface-button-default); color:var(--w-color-text-button); margin: 5px;'
                        const update_hover_colors = "onMouseOver=\"this.style.backgroundColor='var(--w-color-surface-button-hover)'\" onMouseOut=\"this.style.backgroundColor='var(--w-color-surface-button-default)'"
                        frame.innerHTML += `<button data-term-id="${item.id}" style="${button_style}" ${update_hover_colors}">${item.term}</button>`
                    }
                    for (const button of frame.children) {
                        button.onclick = this.handleSetTerm
                    }
                })
        };

        // set the searchbox text to selected text
        searchBox.value = current_selected_text;

        // update search while the user types
        searchBox.onkeyup = (e) => {
            getSearchTerms();
        }

        // run the search initially
        getSearchTerms();
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
            content: `<h4 style="color: white">${this.state.term.term}</h4><p>${this.state.term.definition}</p>`,
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

        return window.React.createElement("span", {
        id: `term_${this.state.term.id}_${this.state.randomString}`,
        style: {
            textDecorationLine: "underline",
            textDecorationColor: "green",
            textDecorationThickness: 3,
            color: "green"
        },
        children: this.props.children
    })
    }
}

window.draftail.registerPlugin({
    type: 'TERM',
    source: TermSource,
    decorator: Term,
}, 'entityTypes');