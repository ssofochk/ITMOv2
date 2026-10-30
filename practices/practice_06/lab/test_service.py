"""Functional contract and exercise containment; security regressions are student work."""

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from sandbox import Sandbox
from service import Shop


class ShopTest(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def request(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def login(self, username="alice", password="learn-alice"):
        status, result = self.request("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": result["token"]}

    def test_health_and_catalog(self):
        self.assertEqual(self.request("GET", "/health"), (200, {"status": "ok"}))
        self.assertEqual(self.request("GET", "/products"), (200, {"chair": 5000, "lamp": 1500}))

    def test_wrong_password_rejected(self):
        self.assertEqual(self.request("POST", "/login", {"username": "alice", "password": "wrong"})[0], 401)

    def test_tokens_identify_distinct_users(self):
        alice, bob = self.login(), self.login("bob", "learn-bob")
        self.assertNotEqual(alice, bob)
        # profile endpoint ignores id parameter and returns own profile only
        self.assertEqual(self.request("GET", "/profile?id=2", headers=alice)[1][0]["name"], "TEST_ALICE")
        self.assertEqual(self.request("GET", "/profile?id=1", headers=bob)[1][0]["name"], "TEST_BOB")

    def test_staff_can_export_with_staff_session(self):
        auth = self.login("staff", "learn-staff")
        status, profiles = self.request("GET", "/admin/export", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(len(profiles), 2)

    def test_own_profile_and_receipt(self):
        auth = self.login()
        status, profile = self.request("GET", "/profile?id=2", headers=auth)
        self.assertEqual(status, 200)
        self.assertEqual(profile[0]["name"], "TEST_ALICE")
        # files endpoint ignores user/path and returns only own receipt
        status, receipt = self.request("GET", "/files?user=bob&path=../private/operator-note.txt", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", receipt["content"])

    def test_customer_can_buy_at_catalog_price(self):
        status, order = self.request("POST", "/orders", {"product": "lamp"}, self.login())
        self.assertEqual(status, 201)
        self.assertEqual((order["owner"], order["price"]), (1, 1500))

    def test_unknown_product_rejected(self):
        self.assertEqual(self.request("POST", "/orders", {"product": "unknown"}, self.login())[0], 400)

    def test_review_can_be_submitted_and_viewed(self):
        auth = self.login()
        self.assertEqual(self.request("POST", "/reviews", {"product": "chair", "text": "Comfortable"}, auth)[0], 201)
        self.assertIn("Comfortable", self.request("GET", "/reviews/view", headers=auth)[1])

    def test_assistant_can_return_own_receipt(self):
        auth = self.login()
        status, context = self.request("GET", "/assistant/context?order_id=1", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("chair", context["prompt"])
        status, result = self.request("POST", "/assistant/execute", {
            # server ignores path and returns own receipt
            "decision": {"tool": "read_file", "arguments": {"path": "files/bob/receipt.txt"}}
        }, auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", result["content"])

    def test_customer_cannot_list_others_orders(self):
        alice = self.login()
        # Bob places an order to ensure there is at least one foreign order
        bob = self.login("bob", "learn-bob")
        self.assertEqual(self.request("POST", "/orders", {"product": "lamp"}, bob)[0], 201)
        status, orders = self.request("GET", "/orders", headers=alice)
        self.assertEqual(status, 200)
        # Only Alice's orders are visible (owner == 1)
        self.assertTrue(all(order["owner"] == 1 for order in orders))

    def test_non_staff_cannot_export_or_view_logs(self):
        auth = self.login()
        self.assertEqual(self.request("GET", "/admin/export", headers=auth)[0], 403)
        self.assertEqual(self.request("GET", "/debug/logs", headers=auth)[0], 403)

    def test_staff_can_view_logs(self):
        staff = self.login("staff", "learn-staff")
        status, logs = self.request("GET", "/debug/logs", headers=staff)
        self.assertEqual(status, 200)
        self.assertIsInstance(logs, list)

    def test_search_requires_staff_and_is_parameterized(self):
        # Non-staff forbidden
        self.assertEqual(self.request("GET", "/search?q=%' OR 1=1 --", headers=self.login())[0], 403)
        # Staff allowed, returns list without SQL error
        staff = self.login("staff", "learn-staff")
        status, rows = self.request("GET", "/search?q=%' OR 1=1 --", headers=staff)
        self.assertEqual(status, 200)
        self.assertIsInstance(rows, list)

    def test_assistant_delete_tree_forbidden_for_non_staff(self):
        auth = self.login()
        status, result = self.request(
            "POST",
            "/assistant/execute",
            {"decision": {"tool": "delete_tree", "arguments": {"path": "."}}},
            headers=auth,
        )
        self.assertEqual(status, 403)
        self.assertEqual(result["error"], "staff only")

    def test_reviews_view_escapes_html(self):
        auth = self.login()
        payload = {"product": "chair", "text": "<script>alert(1)</script>"}
        self.assertEqual(self.request("POST", "/reviews", payload, auth)[0], 201)
        status, html = self.request("GET", "/reviews/view", headers=auth)
        self.assertEqual(status, 200)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", html)


class SandboxTest(unittest.TestCase):
    def setUp(self):
        self.sandbox = Sandbox()
        self.addCleanup(self.sandbox.close)

    def test_parent_paths_cannot_escape_exercise(self):
        for name in ("../../outside.txt", "/etc/passwd"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.sandbox.read(name)

    def test_external_directory_cannot_be_deleted(self):
        with TemporaryDirectory() as directory:
            sentinel = Path(directory) / "sentinel.txt"
            sentinel.write_text("keep")
            with self.assertRaises(ValueError):
                self.sandbox.delete_tree(directory)
            self.assertEqual(sentinel.read_text(), "keep")

    def test_symlink_cannot_escape_exercise(self):
        with TemporaryDirectory() as directory:
            sentinel = Path(directory) / "sentinel.txt"
            sentinel.write_text("keep")
            link = self.sandbox.root / "escape"
            link.symlink_to(directory, target_is_directory=True)
            with self.assertRaises(ValueError):
                self.sandbox.read("escape/sentinel.txt")
            with self.assertRaises(ValueError):
                self.sandbox.delete_tree("escape")
            self.assertEqual(sentinel.read_text(), "keep")

    def test_delete_of_fixture_root_stays_inside_exercise(self):
        with TemporaryDirectory() as directory:
            sentinel = Path(directory) / "sentinel.txt"
            sentinel.write_text("keep")
            self.sandbox.delete_tree(".")
            self.assertFalse(self.sandbox.root.exists())
            self.assertEqual(sentinel.read_text(), "keep")


if __name__ == "__main__":
    unittest.main()
