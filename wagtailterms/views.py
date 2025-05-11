from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from taggit.models import Tag
from django.db import models

from .models import Term
from .permissions import CanAccessTags
from .serializers import TermSerializer

from .default_settings import get_setting
from wagtail.search.backends import get_search_backend

from django.http import Http404
class TermPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })


class TermViewSet(ReadOnlyModelViewSet):
    serializer_class = TermSerializer
    pagination_class = TermPagination

    def get_queryset(self):
        q = self.request.query_params.get("q")
        tags = self.request.query_params.getlist("tags")

        queryset = Term.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(live=True)
            
        tags_objects = []
        if not get_setting('disable_tags'):
            # Apply tag filters if provided - require ALL tags to match
            tags_objects = Tag.objects.filter(name__in=tags)
        if tags_objects:
            # Using a loop to filter by each tag can lead to multiple JOINs and may impact performance when many tags
            # are involved. However, alternative approaches can involve multiple queries and complexity and don't
            # work with wagtail search. Such as using Q objects or annotations. Also, tag filtering more often than
            # not will be a small number of tags.
            for tag in tags_objects:
                queryset = queryset.filter(tags=tag)

        # Apply search if provided
        if q:
            queryset = get_search_backend().search(q, queryset,operator="or")
        return queryset

    @action(detail=False, methods=['get'])
    def tags(self, request):
        if get_setting('disable_tags'):
            raise Http404()
        permission_checker = CanAccessTags()
        # Pass 'self' (the view instance) to provide the permission checker with access to the view's context or attributes,
        # which might be necessary for evaluating permissions.
        if not permission_checker.has_permission(request, self):
            return Response(
                {"error": permission_checker.message or "You do not have permission to access this endpoint."},
                status=403 # Forbidden
            )
        
        
        try:
            page = int(request.query_params.get('page', 1))
            if page < 1: # Ensure page is not negative or zero
                page = 1
        except ValueError:
            page = 1  # Default to page 1 if input is invalid
        page_size = 50  # Number of tags per page
        
        # Get all unique tags from live terms, ordered by usage count
        tags = Tag.objects.filter(
            wagtailterms_wagtailtermtag_items__content_object__live=True
        ).annotate(
            usage_count=models.Count('wagtailterms_wagtailtermtag_items')
        ).order_by('-usage_count')

        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_tags = tags[start:end]
        has_more = tags.count() > end
        
        # Return tags with their counts and pagination info
        return Response({
            'tags': [
                {"name": tag.name, "count": tag.usage_count} 
                for tag in paginated_tags
            ],
            'hasMore': has_more
        })
