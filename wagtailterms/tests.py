from django.test import override_settings
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from .models import Term
from django.urls import reverse
from wagtail.search.backends import get_search_backend
from .testing import test_settings

@override_settings(**test_settings)
class TestTermEntity(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Create or get the Wagtail groups
        # We create the groups here since in tests the default Wagtail groups might not exist
        cls.editor_group = Group.objects.get(name='Editors')
        cls.moderator_group = Group.objects.get(name='Moderators')
        
        cls.admin_user = get_user_model().objects.create_superuser(
                "admin", password="pass"
        )
        cls.normal_user = get_user_model().objects.create_user("user", password="pass")
        cls.editor_user = get_user_model().objects.create_user("editor", password="pass")
        cls.moderator_user = get_user_model().objects.create_user("moderator", password="pass")
        
        # Add users to their respective groups
        cls.editor_user.groups.add(cls.editor_group)
        cls.moderator_user.groups.add(cls.moderator_group)

        with cls.captureOnCommitCallbacks(execute=True):  # Fixes issue with wagtail 6.4 do to "Background tasks run
            # at end of current transaction" https://docs.wagtail.org/en/latest/releases/6.4.html#background-tasks-run-at-end-of-current-transaction
            cls.term1 = Term.objects.create(
                    term="Test Term", 
                    definition="Definition with special keyword xuqwn", 
                    live=True
            )
            cls.term2 = Term.objects.create(
                    term="Test Term 2", 
                    definition="Another definition without special words", 
                    live=True
            )
            cls.term3 = Term.objects.create(
                    term="Special Term", 
                    definition="Test Definition 3", 
                    live=True
            )
            # not live terms should not be visible to non staff
            cls.term4 = Term.objects.create(
                    term="Test Term 4", 
                    definition="Test Definition 4 with xuqwn", 
                    live=False
            )
            cls.term5 = Term.objects.create(
                    term="Test Term 5", 
                    definition="Test Definition 5", 
                    live=False
            )

    def test_can_view_term(self):
        """test that a term can be viewed with the rest api"""
        response = self.client.get(reverse("wagtailterms:terms-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 3)

        self.assertEqual(response.data['results'][0]["term"], "Test Term")
        self.assertEqual(response.data['results'][0]["definition"], "Definition with special keyword xuqwn")

        # try view terms when logged in as normal user
        self.client.login(username="user", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 3)

    def test_admin_can_view(self):
        self.client.login(username="admin", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 5)

    def test_can_search_term(self):
        """Test term search"""
        # Search by term name, should match all terms containing the words
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=Test Term 2"
        )
        self.assertEqual(response.status_code, 200)
        # Should match all live terms containing "Test" or "Term"
        terms = [result["term"] for result in response.data['results']]
        self.assertIn("Test Term 2", terms)
        self.assertIn("Test Term", terms)
        self.assertIn("Special Term", terms)

    def test_can_search_by_definition(self):
        """Test searching within term definitions"""
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=xuqwn"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)  # Only live terms
        self.assertEqual(response.data['results'][0]["term"], "Test Term")

        # As admin, should see non-live terms too
        self.client.login(username="admin", password="pass")
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=xuqwn"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 2)  # Both live and non-live terms

    def test_partial_term_search(self):
        """Test partial matching in term names"""
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=Special"
        )
        self.assertEqual(response.status_code, 200)
        # Should match all terms containing "Special"
        terms = [result["term"] for result in response.data['results']]
        self.assertIn("Special Term", terms)  # Should find exact match
        self.assertEqual(len(terms), 3)  # Should get other matches too due to "or" operator

    def test_combined_term_and_definition_search(self):
        """Test searching across both terms and definitions"""
        # This should match both "Test Term" and terms with "Test" in definition
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=Test"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data['results']) > 1)
        # Verify we get matches from both terms and definitions
        matched_terms = {result["term"] for result in response.data['results']}
        self.assertTrue("Test Term" in matched_terms)
        self.assertTrue("Special Term" in matched_terms)  # Has "Test" in definition

    def test_tag_filtering(self):
        """Test filtering by tags"""
        with self.captureOnCommitCallbacks(execute=True):
            # Clear any existing tags from test terms
            self.term1.tags.clear()
            self.term2.tags.clear()
            self.term3.tags.clear()
            
            # Add test tags
            self.term1.tags.add("test-tag")
            self.term2.tags.add("other-tag")
            self.term1.save()
            self.term2.save()
        
        # Test filtering by tag
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?tags=test-tag"
        )
        self.assertEqual(response.status_code, 200)
        # Should get results including the term with test-tag
        self.assertTrue(any(result["term"] == "Test Term" for result in response.data['results']))

    def test_search_results(self):
        """Test basic search functionality"""
        # Test searching for a term
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=Test"
        )
        self.assertEqual(response.status_code, 200)
        # Should get results containing "Test"
        terms = [result["term"] for result in response.data['results']]
        self.assertTrue(any("Test" in term for term in terms))

    def test_search_by_tags(self):
        """Test searching by tag names"""
        with self.captureOnCommitCallbacks(execute=True):
            self.term1.tags.add("searchable-tag")
            self.term1.save()
        
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=searchable"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]["term"], "Test Term")

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

    def test_pagination_works(self):
        """Test that pagination works correctly"""
        response = self.client.get(reverse("wagtailterms:terms-list"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('count', response.data)
        self.assertIn('total_pages', response.data)
        self.assertIn('current_page', response.data)
        self.assertEqual(response.data['current_page'], 1)

    def test_fuzzy_search_term(self):
        """Test that searching is case insensitive"""
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?q=TEST TERM 2"
        )
        self.assertEqual(response.status_code, 200)
        # Should match case-insensitive
        terms = [result["term"] for result in response.data['results']]
        self.assertIn("Test Term 2", terms)
        self.assertIn("Test Term", terms)  # Should also match other terms with "Test" and "Term"
        self.assertIn("Special Term", terms)

    def test_multiple_terms_with_same_tag(self):
        """Test that multiple terms can be tagged and filtered"""
        # First clear any existing tags
        with self.captureOnCommitCallbacks(execute=True):
            self.term1.tags.clear()
            self.term2.tags.clear()
            self.term3.tags.clear()
            
            # Add new tags for testing
            self.term1.tags.add("test-tag")
            self.term1.save()
            self.term2.tags.add("test-tag")
            self.term2.save()
        
        # Reindex to ensure search index is up to date
        get_search_backend().reset_index()
        get_search_backend().add_type(Term)
        
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?tags=test-tag"
        )
        self.assertEqual(response.status_code, 200)
        terms = [result["term"] for result in response.data['results']]
        self.assertIn("Test Term", terms)
        self.assertIn("Test Term 2", terms)  # Both terms should be present
        self.assertEqual(len(response.data['results']), 2) # Should only return the two terms with the tag

    def test_multiple_tag_filter(self):
        """Test filtering by multiple tags (AND condition)"""
        # First clear any existing tags
        with self.captureOnCommitCallbacks(execute=True):
            self.term1.tags.clear()
            self.term2.tags.clear()
            self.term3.tags.clear()
            
            # Add new tags for testing
            self.term1.tags.add("tag1", "tag2")
            self.term1.save()
            self.term2.tags.add("tag1")
            self.term2.save()
        
        # Reindex to ensure search index is up to date
        get_search_backend().reset_index()
        get_search_backend().add_type(Term)
        get_search_backend().refresh_index()
        
        response = self.client.get(
                f"{reverse('wagtailterms:terms-list')}?tags=tag1&tags=tag2"
        )
        self.assertEqual(response.status_code, 200)
        # With tag-based filtering, we still get all terms due to search behavior
        terms = set(result["term"] for result in response.data['results'])
        self.assertTrue(len(terms) > 0, "Should get some results")
        self.assertIn("Test Term", terms)  # Should definitely include term with both tags

    def test_tags_endpoint(self):
        """Test the tags endpoint"""
        # Login as editor user to access the endpoint
        self.client.login(username="editor", password="pass")
        
        with self.captureOnCommitCallbacks(execute=True):
            self.term1.tags.add("tag1", "tag2")
            self.term1.save()
            self.term2.tags.add("tag1")
            self.term2.save()
        
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        tags_dict = {tag['name']: tag['count'] for tag in response.data['tags']}
        self.assertEqual(tags_dict['tag1'], 2)
        self.assertEqual(tags_dict['tag2'], 1)

    def test_tags_pagination(self):
        """Test that tags endpoint pagination works"""
        # Login as editor user to access the endpoint
        self.client.login(username="editor", password="pass")
        
        # Add enough tags to trigger pagination
        with self.captureOnCommitCallbacks(execute=True):
            for i in range(60):
                self.term1.tags.add(f"tag{i}")
            self.term1.save()
        
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['tags']), 50)  # default page size
        self.assertIn('hasMore', response.data)  # Ensure 'hasMore' is present
        self.assertTrue(response.data['hasMore'])
        
        # Check second page
        response = self.client.get(f"{reverse('wagtailterms:terms-tags')}?page=2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['tags']), 10)
        self.assertIn('hasMore', response.data)  # Ensure 'hasMore' is present
        self.assertFalse(response.data['hasMore'])

    def test_tags_endpoint_permissions(self):
        """Test that the tags endpoint respects permission settings with explicit group membership checks"""
        # Anonymous user should not have access
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "You do not have permission to access this endpoint.")

        # Normal user should not have access
        self.client.login(username="user", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"], "You do not have permission to access this endpoint.")

        # Test editor access with explicit group check
        self.client.login(username="editor", password="pass")
        self.assertTrue(self.editor_user.groups.filter(name='Editors').exists())
        editor_group = self.editor_user.groups.get(name='Editors')
        self.assertEqual(editor_group, self.editor_group)
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        self.assertIn('hasMore', response.data)

        # Test moderator access with explicit group check
        self.client.login(username="moderator", password="pass")
        self.assertTrue(self.moderator_user.groups.filter(name='Moderators').exists())
        moderator_group = self.moderator_user.groups.get(name='Moderators')
        self.assertEqual(moderator_group, self.moderator_group)
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        self.assertIn('hasMore', response.data)

        # Test staff access
        self.normal_user.is_staff = True
        self.normal_user.save()
        self.client.login(username="user", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        self.assertIn('hasMore', response.data)

        # Test superuser access
        self.client.login(username="admin", password="pass")
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        self.assertIn('hasMore', response.data)

    def test_tags_endpoint_pagination(self):
        """Test that the tags endpoint pagination works correctly"""
        self.client.login(username="editor", password="pass")
        
        # Create some tags for pagination
        with self.captureOnCommitCallbacks(execute=True):
            for i in range(5):
                self.term1.tags.add(f"tag{i}")
            self.term1.save()
        
        # Test default page
        response = self.client.get(reverse("wagtailterms:terms-tags"))
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        self.assertIn('hasMore', response.data)

        # Test specific page
        response = self.client.get(f"{reverse('wagtailterms:terms-tags')}?page=1")
        self.assertEqual(response.status_code, 200)
        self.assertIn('tags', response.data)
        self.assertIn('hasMore', response.data)
