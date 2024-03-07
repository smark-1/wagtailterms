from rest_framework import serializers
from wagtail.templatetags.wagtailcore_tags import richtext
from .models import Term


class TermSerializer(serializers.ModelSerializer):
    definition = serializers.SerializerMethodField()
    class Meta:
        model = Term
        fields = ['term', 'definition','id']

    def get_definition(self, obj):
        return richtext(obj.definition)