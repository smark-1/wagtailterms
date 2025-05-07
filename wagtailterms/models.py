from django.db import models
from wagtail.fields import RichTextField
from wagtail.models import DraftStateMixin, RevisionMixin, LockableMixin
from wagtail.search import index
from modelcluster.fields import ParentalKey
from modelcluster.contrib.taggit import ClusterTaggableManager
from taggit.models import TaggedItemBase
from modelcluster.models import ClusterableModel

class WagtailTermTag(TaggedItemBase):
    content_object = ParentalKey('wagtailterms.Term', on_delete=models.CASCADE, related_name='tagged_terms')

# Create your models here.
class Term(index.Indexed, DraftStateMixin, RevisionMixin, LockableMixin, ClusterableModel):
    term = models.CharField(max_length=25)
    definition = RichTextField()
    tags = ClusterTaggableManager(through=WagtailTermTag, blank=True)

    search_fields = [
        index.AutocompleteField("term", partial_match=True),
        index.FilterField("live"),
    ]

    def __str__(self):
        return self.term
