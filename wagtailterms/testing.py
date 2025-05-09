# Test settings to ensure consistent search behavior
test_settings = {
    'WAGTAILSEARCH_BACKENDS': {
        'default': {
            'BACKEND': 'wagtail.search.backends.database',
            'AUTO_UPDATE': True,
        },
    }
}
