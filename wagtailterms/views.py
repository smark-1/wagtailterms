from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Term
from .serializers import TermSerializer

from wagtail.search.backends import get_search_backend

class TermViewSet(ReadOnlyModelViewSet):

    serializer_class = TermSerializer

    def get_queryset(self):
        q = self.request.query_params.get('q')
        queryset = Term.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(live=True)
        if q:
            return get_search_backend().autocomplete(q,queryset)
        else:
            return queryset