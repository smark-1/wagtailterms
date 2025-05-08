from django.urls import reverse
from wagtail import hooks
from draftjs_exporter.dom import DOM
import wagtail.admin.rich_text.editors.draftail.features as draftail_features
from wagtail.admin.panels import FieldPanel
from wagtail.admin.rich_text.converters.html_to_contentstate import (
    InlineEntityElementHandler,
)
from django.utils.safestring import mark_safe
from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet
from .default_settings import get_setting
from .models import Term

TERM_ICON = get_setting('icon')


@hooks.register("insert_editor_js")
def editor_js():
    # add the path to the terms list view to the javascript so that the url can be set dynamically for the terms api
    path_to_term = reverse("wagtailterms:terms-list")
    wagtail_term_styles = get_setting('style')
    return mark_safe(f'<script>const WAGTAIL_TERM_PATH = "{path_to_term}"; const WAGTAIL_TERM_STYLE = "{wagtail_term_styles}"</script>')


@hooks.register("register_rich_text_features")
def register_term_feature(features):
    features.default_features.append("term")
    """
    Registering the `term` feature, which uses the `TERM` Draft.js entity type,
    and is stored as HTML with a `<span data-term>` tag.
    """
    feature_name = "term"
    type_ = "TERM"

    control = {
        "type": type_,
        "icon": TERM_ICON,
        "description": "Term",
    }

    features.register_editor_plugin(
        "draftail",
        feature_name,
        draftail_features.EntityFeature(
            control,
            js=[
                "wagtailterms/popup-js-1.4.2.js",
                "wagtailterms/term.js",
                "wagtailterms/popperjs.js",
                "wagtailterms/tippyjs.js",
            ],
        ),
    )

    features.register_converter_rule(
        "contentstate",
        feature_name,
        {
            # Note here that the conversion is more complicated than for blocks and inline styles.
            "from_database_format": {
                "span[data-term]": TermEntityElementHandler(type_)
            },
            "to_database_format": {"entity_decorators": {type_: term_entity_decorator}},
        },
    )


def term_entity_decorator(props):
    """
    Draft.js ContentState to database HTML.
    Converts the TERM entities into a span tag.
    """
    return DOM.create_element(
        "span",
        {
            "style": get_setting('style'),
            "data-term": props["term"]["id"],
        },
        props["children"],
    )


class TermEntityElementHandler(InlineEntityElementHandler):
    """
    Database HTML to Draft.js ContentState.
    Converts the span tag into a TERM entity, with the right data.
    """

    mutability = "MUTABLE"

    def get_attribute_data(self, attrs):
        """
        Take the `term` value from the `data-term` HTML attribute.
        """
        try:
            term = Term.objects.get(id=attrs["data-term"])
            return {
                "term": {
                    "term": term.term,
                    "definition": term.definition,
                    "id": term.id,
                    "tags": list(term.tags.names()),
                }
            }
        except Term.DoesNotExist:
            return {
                "term": {
                    "term": "<span style='color:red'>Term Not Found</span>",
                    "definition": "<i>This term might be deleted</i>",
                    "id": 0,
                    "tags": [],
                }
            }


class TermViewSet(SnippetViewSet):
    model = Term

    panels = [
        FieldPanel("term"),
        FieldPanel("definition"),
        FieldPanel("tags"),
    ]
    icon = TERM_ICON
    add_to_admin_menu = True
    menu_label = "Terms"
    menu_name = "term"
    menu_order = get_setting('menu_order')


register_snippet(TermViewSet)
