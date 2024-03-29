# Wagtail Terms
A Wagtail package to add support for a glossary terms entity to Draftail

## Installation
```bash
pip install wagtailterms
```
Add `wagtailterms` to your `INSTALLED_APPS` in your Django settings file.
Make sure you have rest_framework in your installed apps as well.

Migrate the database
```bash
python manage.py migrate
```


Add `wagtailterms.urls` to your `urlpatterns` in your Django urls file.
the url should look like this:
```python
path('api/terms/', include('wagtailterms.urls')),
```

---
#### ⚠️ Note

The url path can be anything you want. This is the url that will be used to access the terms on the frontend

---

## Usage
This wagtail package adds a Draftail entity to create a term that is mapped to a definition. The most common use case would be for the user to hover over a word/phrase on a page and a definition would appear next to the word/phrase.
It allows you to Highlight a word/phrase in the Draftail/richtext editor and search for a definition that was created as a TermSnippet. In the editor the term name and definition will appear on top of the phrase when hovering over the phrase.

### Creating new terms
Click in the admin side bar Terms -> Add New
<p align="center" width="100%">
<img width="50%" src="./example/images/create_term_1.png">
</p>
<p align="center" width="100%">
<img width="50%" src="./example/images/create_term_2.png">
</p>

### Use term entity in editor

<p align="center" width="100%">
<img width="50%" src="./example/images/add_term_1.png">
</p>

Search for term


<p align="center" width="100%">
<img width="50%" src="./example/images/add_term_2.png">
</p>
<p align="center" width="100%">
<img width="50%" src="./example/images/search_term.png">
</p>

Select term

<p align="center" width="100%">
<img width="50%" src="./example/images/add_term_3.png">
</p>

Entity displayed in editor

<p align="center" width="100%">
<img width="50%" src="./example/images/add_term_4.png">
</p>

<p align="center" width="100%">
<img width="50%" src="./example/images/basic_term_editor_1.png">
</p>

<p align="center" width="100%">
<img width="50%" src="./example/images/basic_term_editor_2.png">
</p>


### Display in template
To display the terms on the frontend the term shows up as a `<span>` element 
tag with a green underline and green text. In a future update this will be customizable. 
The element has a data-term  attribute that contains the term id. It is up to the developer to fetch
the term and definition to display it. To get the term by id fetch the term by id using the term API.

Rendered HTML of the term in the frontend:
```html
<span style="text-decoration-line: underline; text-decoration-color: green;text-decoration-thickness: 3px;color:green;" data-term="1">term 1</span>
```

The most basic implementation: ([See full example](./example/home/templates/home/basic_page.html))
```javascript
function showterm(e){
    const termid = e.target.dataset.term
    fetch(`/api/terms/${termid}/`)
        .then(response=> response.json())
        .then(data => {
            alert(`term = ${data.term} \ndefinition = ${data.definition}`)
        })
}

for(const term of document.querySelectorAll('[data-term]')){
    term.onmouseover=showterm;
}
```
The page would look like this:

<p align="center" width="100%">
<img width="50%" src="./example/images/view_basic_1.png">
</p>

On hover
<p align="center" width="100%">
<img width="50%" src="./example/images/view_basic_2.png">
</p>

A more advanced way would be to use a library like [tippy.js](https://atomiks.github.io/tippyjs/) to 
create a tooltip that appears when hovering over the term. ([See full example](./example/home/templates/home/advanced_page.html))
```javascript
function add_tooltips(){
    const tips = tippy('[data-term]', {
        content: 'Loading...',
        allowHTML:true,
        interactive:true,
        theme:'light',
        animation: 'scale-subtle',
        onCreate(instance) {
            // Setup our own custom state properties
            // set if was loaded
            instance._fetchInitualized = false;
            instance._error = null;
        },
        onShow(instance) {
            if (instance._fetchInitualized || instance._error) {
                return;
            }

            instance._fetchInitualized = true;
            fetch(`/api/terms/${instance.reference.dataset.term}/`)
                .then(response => response.json())
                .then(data => {
                    if (data.term){
                        instance.setContent(`<h4>${data.term}</h4><p>${data.definition}</p>`);
                    }else{
                        instance.setContent("<p style='color: red'>Could not find definition</p>");
                    }
                })
                .catch(error => {
                    instance._error = error;
                    instance.setContent(`Request failed. ${error}`);
                });
        },
    });
}
add_tooltips();
```
The page would look like this:
<p align="center" width="100%">
<img width="50%" src="./example/images/view_advanced_1.png">
</p>

On hover
<p align="center" width="100%">
<img width="50%" src="./example/images/view_advanced_2.png">
</p>


## REST API
`/api/terms/` will return:

    [
      {
          "term": "term 1",
          "definition": "<p data-block-key=\"51h82\">this is term 1</p>",
          "id": 1
      },
        {
          "term": "example 2",
          "definition": "<p data-block-key=\"83b17\">this is another example</p>",
          "id": 2
      }
    ]

/api/terms/1/ will return:

    {
        "term": "term 1",
        "definition": "<p data-block-key=\"51h82\">this is term 1</p>",
        "id": 1
    }



## To Do
- Allow icon to be customized
- Allow frontend styles to be changed
- Allow menu position to be changed
- Include a default javascript implementation for frontend
- Support dark mode
- Fix choose term search form wider than modal