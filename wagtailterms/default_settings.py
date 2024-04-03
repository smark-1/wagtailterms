from django.conf import settings

# icon
# term_style
# menu_position
DEFAULT_WAGTAILTERMS_SETTINGS = {
    'icon': 'snippet',
    'menu_order': 200
}


def get_setting(setting):
    if hasattr(settings, 'WAGTAILTERMS'):
        return settings.WAGTAILTERMS.get(setting, DEFAULT_WAGTAILTERMS_SETTINGS.get(setting))
    else:
        return DEFAULT_WAGTAILTERMS_SETTINGS.get(setting)
