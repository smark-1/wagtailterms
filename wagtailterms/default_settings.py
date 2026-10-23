from django.conf import settings

# icon
# term_style
# menu_position
DEFAULT_WAGTAILTERMS_SETTINGS = {
    'icon': 'snippet',
    'menu_order': 200,
    'style': "text-decoration-line: underline; text-decoration-color: green; text-decoration-thickness: "
             "3px;color:green;",
    'class': "term",
    'disable_tags': False,
    'embedded_tooltip': False, # Make tooltip from data-[...] attribute
    'add_link': False, # Add link to tooltip
    'base_url': "", # URL for link
    'as_anchor': True, # if link is # on base_url or /
    'max_word_length': 40
}


def get_setting(setting):
    if hasattr(settings, 'WAGTAILTERMS'):
        return settings.WAGTAILTERMS.get(setting, DEFAULT_WAGTAILTERMS_SETTINGS.get(setting))
    else:
        return DEFAULT_WAGTAILTERMS_SETTINGS.get(setting)
