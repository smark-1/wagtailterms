from django.db import models
from wagtail.admin.panels import FieldPanel
from wagtail import blocks
from wagtail.fields import StreamField, RichTextField

from wagtail.models import Page


class HomePage(Page):
    pass


class BasicPage(Page):
    content = RichTextField()

    content_panels = Page.content_panels + [
        FieldPanel("content"),
    ]


class AdvancedPage(Page):
    content = StreamField(
        [
            ("heading", blocks.CharBlock(form_classname="title")),
            ("paragraph", blocks.RichTextBlock()),
        ],
        blank=True,
        use_json_field=True,
    )

    content_panels = Page.content_panels + [
        FieldPanel("content"),
    ]
