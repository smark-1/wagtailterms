# Wagtail Terms
A Wagtail plugin to add support for a glossary terms entity to Draftail

## Installation
```bash
pip install wagtailterms
```
add `wagtailterms` to your `INSTALLED_APPS` in your Django settings file.
make sure you have rest_framework in your installed apps as well.

Add `wagtailterms.urls` to your `urlpatterns` in your Django urls file.
the url should look like this:
```python
    path('api/terms/', include('wagtailterms.urls')),
```

---
**NOTE**

The url path can be anything you want. This is the url that will be used to access the terms on the frontend

---

 run `python manage.py migrate` to create the database tables.
