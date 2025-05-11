from rest_framework import serializers
from wagtail.templatetags.wagtailcore_tags import richtext
from .models import Term
from taggit.serializers import (TagListSerializerField,
                              TaggitSerializer)
from wagtailterms.default_settings import get_setting


class TermSerializer(TaggitSerializer, serializers.ModelSerializer):
    definition = serializers.SerializerMethodField()

    class Meta:
        model = Term
        fields = ["term", "definition", "id"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not get_setting('disable_tags'):
            self.fields['tags'] = TagListSerializerField()

    def get_definition(self, obj):
        return richtext(obj.definition)
