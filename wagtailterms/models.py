from django.db import models
from wagtail.fields import RichTextField
from wagtail.models import DraftStateMixin, RevisionMixin, LockableMixin
from wagtail.search import index


# Create your models here.
class Term(index.Indexed, DraftStateMixin, RevisionMixin, LockableMixin, models.Model):
    term = models.CharField(max_length=25)
    definition = RichTextField()

    search_fields = [
        index.AutocompleteField("term", partial_match=True),
        index.FilterField("live"),
    ]

    def __str__(self):
        return self.term
