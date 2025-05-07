from django.urls import path
from .views import TermViewSet

app_name = "wagtailterms"

urlpatterns = [
    path("", TermViewSet.as_view({"get": "list"}), name="terms-list"),
    path("<int:pk>/", TermViewSet.as_view({"get": "retrieve"}), name="terms-detail"),
    path("tags/", TermViewSet.as_view({"get": "tags"}), name="terms-tags"),
]
