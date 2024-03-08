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
This wagtail package adds a Draftail entity to create a term and a definition for a word. The most common use case would be for the user to hover over a word on a page and a definition would appear above the word.
