from rest_framework.permissions import BasePermission

class CanAccessTags(BasePermission):
    """
    Custom permission to only allow access to users who are staff,
    superusers, or in 'Moderators' or 'Editors' groups.
    """
    message = "You do not have permission to access this endpoint."

    def has_permission(self, request, view):
        user = request.user
       

        if user.is_authenticated and (user.is_staff or user.is_superuser):
            return True

        # Check if user is in 'Moderators' or 'Editors' group
        if user.is_authenticated and user.groups.filter(name__in=['Moderators', 'Editors']).exists():
            return True

        return False
