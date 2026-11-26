from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.search.models import SavedSearch

User = get_user_model()


class SavedSearchApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="saved@example.com",
            username="saved-user",
            password="testpassword123",
            role="buyer",
        )
        self.other_user = User.objects.create_user(
            email="other-saved@example.com",
            username="other-saved-user",
            password="testpassword123",
            role="buyer",
        )
        self.client.force_authenticate(user=self.user)

    def test_saved_search_crud_and_user_isolation(self):
        create_response = self.client.post(
            "/api/saved-searches/",
            {
                "name": "BMW Alerts",
                "filters": {"brand": "BMW", "max_price": 5000000},
                "notify_push": True,
                "notify_email": False,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        saved_search_id = create_response.data["id"]

        SavedSearch.objects.create(
            user=self.other_user,
            name="Hidden",
            filters={"brand": "Audi"},
            notify_push=True,
            notify_email=True,
            new_matches_count=9,
        )

        list_response = self.client.get("/api/saved-searches/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        results = list_response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], saved_search_id)

        update_response = self.client.patch(
            f"/api/saved-searches/{saved_search_id}/",
            {"notify_email": True},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertTrue(update_response.data["notify_email"])

        delete_response = self.client.delete(f"/api/saved-searches/{saved_search_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavedSearch.objects.filter(id=saved_search_id).exists())

    def test_ack_and_reset_actions_clear_new_matches_count(self):
        saved_search = SavedSearch.objects.create(
            user=self.user,
            name="M3 Search",
            filters={"model": "M3"},
            notify_push=True,
            notify_email=True,
            new_matches_count=4,
        )

        ack_response = self.client.patch(f"/api/saved-searches/{saved_search.id}/ack/")
        self.assertEqual(ack_response.status_code, status.HTTP_200_OK)
        self.assertEqual(ack_response.data["new_matches_count"], 0)

        saved_search.refresh_from_db()
        saved_search.new_matches_count = 7
        saved_search.save(update_fields=["new_matches_count"])

        reset_response = self.client.patch(f"/api/saved-searches/{saved_search.id}/reset/")
        self.assertEqual(reset_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reset_response.data["new_matches_count"], 0)

    def test_user_cannot_access_other_users_saved_search(self):
        other_saved_search = SavedSearch.objects.create(
            user=self.other_user,
            name="Other User Search",
            filters={"foo": "bar"},
            notify_push=True,
            notify_email=True,
            new_matches_count=3,
        )

        response = self.client.patch(f"/api/saved-searches/{other_saved_search.id}/ack/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
