from rest_framework.permissions import BasePermission

class CanAccessTags(BasePermission):
    """
    Custom permission to only allow access to users who are staff,
    superusers, or in 'Moderators' or 'Editors' groups.
    """
    message = "You do not have permission to access this endpoint."

    def has_permission(self, request, view):
        user = request.user
       

        if (user.is_staff or user.is_superuser) and user.is_authenticated:
            return True

        # Check if user is in 'Moderators' or 'Editors' group
        if user.groups.filter(name__in=['Moderators', 'Editors']).exists() and user.is_authenticated:
            return True

        return False
