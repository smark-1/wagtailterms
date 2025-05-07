from rest_framework import serializers
from wagtail.templatetags.wagtailcore_tags import richtext
from .models import Term
from taggit.serializers import (TagListSerializerField,
                              TaggitSerializer)


class TermSerializer(TaggitSerializer, serializers.ModelSerializer):
    definition = serializers.SerializerMethodField()
    tags = TagListSerializerField()

    class Meta:
        model = Term
        fields = ["term", "definition", "id", "tags"]

    def get_definition(self, obj):
        return richtext(obj.definition)
