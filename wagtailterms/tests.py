from django.test import override_settings
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Term
from django.urls import reverse


class TestTermEntity(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = get_user_model().objects.create_superuser(
                "admin", password="pass"
        )
        cls.normal_user = get_user_model().objects.create_user("user", password="pass")

        with cls.captureOnCommitCallbacks(execute=True):  # Fixes issue with wagtail 6.4 do to "Background tasks run
            # at end of current transaction" https://docs.wagtail.org/en/latest/releases/6.4.html#background-tasks-run-at-end-of-current-transaction
            cls.term1 = Term.objects.create(
                    term="Test Term", definition="Test Definition", live=True
            )
            cls.term2 = Term.objects.create(
                    term="Test Term 2", definition="Test Definition 2", live=True
            )
            cls.term3 = Term.objects.create(
                    term="Test Term 3", definition="Test Definition 3", live=True
            )

            # not live terms should not be visible to non staff
            cls.term4 = Term.objects.create(
                    term="Test Term 4", definition="Test Definition 4", live=False
            )
            cls.term5 = Term.objects.create(
                    term="Test Term 5", definition="Test Definition 5", live=False
            )

    def test_can_view_term(self):
        """test that a term can be viewed with the rest api"""
        response = self.client.get(reverse("wagtailterms:terms-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

        self.assertEqual(response.data[0]["term"], "Test Term")
        self.assertEqual(response.data[0]["definition"], "Test Definition")

        # try view terms when logged in as normal user
        self.client.login(username="user", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)

    def test_admin_can_view(self):
        self.client.login(username="admin", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)

    def test_can_search_term(self):
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=Test Term 2"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["term"], "Test Term 2")

    def test_can_change_icon(self):
        from . import wagtail_hooks

        self.assertEqual(wagtail_hooks.TERM_ICON, 'snippet')

        with self.settings(WAGTAILTERMS={'icon': "bin"}):
            from . import wagtail_hooks

            self.assertEqual(wagtail_hooks.get_setting('icon'), 'bin')

    def test_menu_order_works(self):
        from . import wagtail_hooks

        self.assertEqual(wagtail_hooks.TermViewSet.menu_order, 200)

    @override_settings(WAGTAILTERMS={'menu_order': 900})
    def test_can_change_menu_order(self):
        from . import wagtail_hooks
        self.assertEqual(wagtail_hooks.get_setting('menu_order'), 900)
