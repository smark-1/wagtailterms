from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from taggit.models import Tag
from django.db import models

from .models import Term
from .serializers import TermSerializer

from wagtail.search.backends import get_search_backend


class TermViewSet(ReadOnlyModelViewSet):
    serializer_class = TermSerializer

    def get_queryset(self):
        q = self.request.query_params.get("q")
        tags = self.request.query_params.getlist("tags[]")
        
        queryset = Term.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(live=True)
            
        # Apply tag filters if provided
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__name=tag)
            
        # Apply search if provided
        if q:
            queryset = get_search_backend().autocomplete(q, queryset)
            
        return queryset
            
    @action(detail=False, methods=['get'])
    def tags(self, request):
        q = request.query_params.get('q', '').lower()
        # Get all unique tags from live terms, ordered by usage count
        tags = Tag.objects.filter(
            wagtailterms_wagtailtermtag_items__content_object__live=True
        ).annotate(
            usage_count=models.Count('wagtailterms_wagtailtermtag_items')
        ).order_by('-usage_count')
        
        if q:
            tags = tags.filter(name__icontains=q)
            
        # Return tags with their counts
        return Response([
            {"name": tag.name, "count": tag.usage_count} 
            for tag in tags
        ])
