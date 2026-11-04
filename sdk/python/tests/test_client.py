import io
import hashlib
import json
import threading
import unittest
from http.client import IncompleteRead
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse

from tidelight import ApiError, Client, get_public_decision_capsule, verify_public_decision_capsule

KEY = "tl_test_" + "a" * 43
INSTRUMENT = {"symbol": "RNVDAUSDT", "instrument_type": "tokenized_equity_spot", "underlying_ticker": "NVDA", "issuer_name": "NVIDIA", "quote_currency": "USDT", "last_price": 1.0, "change_24h": None, "provider_timestamp": None, "market_session_status": "available", "source": "Bitget Reality spot"}


class FakeResponse(io.BytesIO):
    def __init__(self, data):
        super().__init__(json.dumps(data).encode())
        self.status = 200
        self.headers = {}


class ClientTests(unittest.TestCase):
    def test_public_capsule_fetch_verifies_digest_without_api_credentials(self):
        from tidelight.client import _canonical_json

        snapshot = {"schemaVersion": 1, "integrityScope": "disclosed_public_projection", "research": {"question": "NVDA?", "createdAt": "2026-11-01T00:00:00Z"}}
        digest = hashlib.sha256(_canonical_json(snapshot).encode()).hexdigest()
        payload = {"schemaVersion": 1, "publishedAt": "2026-11-01T00:00:00Z", "snapshot": snapshot, "integrityHash": digest, "hashAlgorithm": "sha256", "integrity": "valid"}
        calls = []

        def opener(request, timeout):
            calls.append((request.full_url, request.get_header("Authorization")))
            return FakeResponse(payload)

        client = Client(KEY, opener=opener)
        result = client.get_public_decision_capsule("a" * 43)
        self.assertEqual(result["snapshot"]["research"]["question"], "NVDA?")
        self.assertEqual(calls[0][0], "https://tidelight.app/api/decision-capsules/public/" + "a" * 43)
        self.assertIsNone(calls[0][1])
        self.assertTrue(verify_public_decision_capsule(payload))
        tampered = {**payload, "integrityHash": "0" * 64}
        self.assertFalse(verify_public_decision_capsule(tampered))
        null_digest = hashlib.sha256(b"null").hexdigest()
        self.assertFalse(verify_public_decision_capsule({"hashAlgorithm": "sha256", "integrityHash": null_digest}))
        with self.assertRaises(ValueError):
            client.get_public_decision_capsule("bad/token")
        public_only = get_public_decision_capsule("a" * 43, opener=opener)
        self.assertEqual(public_only["integrity"], "valid")

        local_client = Client(KEY, public_base_url="http://localhost:3000", opener=opener)
        local_client.get_public_decision_capsule("a" * 43)
        self.assertTrue(calls[-1][0].startswith("http://localhost:3000/"))
        preview_client = Client(KEY, public_base_url="https://preview.tidelight.example", opener=opener)
        preview_client.get_public_decision_capsule("a" * 43)
        self.assertTrue(calls[-1][0].startswith("https://preview.tidelight.example/"))

        shared = {"z": -0.0, "a": {"unicode": "NVIDIA ™", "tiny": 1e-7, "micro": 1e-6, "near": 1.23e20, "prob": 0.7, "whole": 1.0}, "items": [True, None, 3]}
        self.assertEqual(_canonical_json(shared), '{"a":{"micro":0.000001,"near":123000000000000000000,"prob":0.7,"tiny":1e-7,"unicode":"NVIDIA ™","whole":1},"items":[true,null,3],"z":0}')
        self.assertTrue(verify_public_decision_capsule({"snapshot": shared, "hashAlgorithm": "sha256", "integrityHash": "d9e3e417a7e61eaeeb90ce493e07e959ee65d4801282f69c559aa8f9bf55dc98"}))

    def test_python_public_capsule_canonical_json_matches_javascript_surrogate_escaping(self):
        from tidelight.client import _canonical_json

        value = {"split": "a" * 3999 + "\ud83d", "emoji": "😀", "pair": "\ud83d\ude00", "literal": r"\ud83d"}
        expected = '{"emoji":"😀","literal":"\\\\ud83d","pair":"😀","split":"' + "a" * 3999 + r"\ud83d" + '"}'
        canonical = _canonical_json(value)
        self.assertEqual(canonical, expected)
        publication = {"snapshot": value, "hashAlgorithm": "sha256", "integrityHash": hashlib.sha256(canonical.encode("utf-8")).hexdigest()}
        self.assertTrue(verify_public_decision_capsule(publication))

    def test_public_capsule_http_string_error_becomes_api_error(self):
        def opener(request, timeout):
            raise HTTPError(request.full_url, 404, "Not found", {}, io.BytesIO(b'{"error":"Public capsule not found."}'))

        with self.assertRaises(ApiError) as caught:
            get_public_decision_capsule("a" * 43, opener=opener, max_retries=0)
        self.assertEqual(caught.exception.status, 404)
        self.assertEqual(str(caught.exception), "Public capsule not found.")

    def test_public_capsule_truncated_error_body_remains_an_api_error(self):
        class TruncatedErrorBody(io.BytesIO):
            def read(self, *args, **kwargs):
                raise IncompleteRead(b'{"error":', 20)

        def opener(request, timeout):
            raise HTTPError(request.full_url, 503, "Unavailable", {}, TruncatedErrorBody(b""))

        with self.assertRaises(ApiError) as caught:
            get_public_decision_capsule("a" * 43, opener=opener, max_retries=0)
        self.assertEqual(caught.exception.status, 503)
        self.assertEqual(caught.exception.code, "public_capsule_error")

    def test_public_capsule_malformed_success_body_becomes_api_error(self):
        class MalformedResponse(io.BytesIO):
            status = 200

        with self.assertRaises(ApiError) as caught:
            get_public_decision_capsule("a" * 43, opener=lambda *_args, **_kwargs: MalformedResponse(b"<html>proxy error</html>"), max_retries=0)
        self.assertEqual(caught.exception.status, 200)
        self.assertEqual(caught.exception.code, "invalid_response")

    def test_public_capsule_retries_truncated_response_body(self):
        from tidelight.client import _canonical_json

        snapshot = {"schemaVersion": 1, "research": {"question": "NVDA?"}}
        digest = hashlib.sha256(_canonical_json(snapshot).encode()).hexdigest()
        payload = {"schemaVersion": 1, "publishedAt": "2026-11-01T00:00:00Z", "snapshot": snapshot, "integrityHash": digest, "hashAlgorithm": "sha256", "integrity": "valid"}
        calls = []

        class TruncatedResponse(io.BytesIO):
            status = 200

            def read(self, *args, **kwargs):
                raise IncompleteRead(b"{\"schema", 20)

        def opener(request, timeout):
            calls.append(request.full_url)
            if len(calls) == 1:
                return TruncatedResponse(b"")
            return FakeResponse(payload)

        result = get_public_decision_capsule("a" * 43, opener=opener, sleeper=lambda _seconds: None, max_retries=1)
        self.assertEqual(result["integrity"], "valid")
        self.assertEqual(len(calls), 2)

    def test_research_job_creation_status_and_cancellation(self):
        job_id = "01234567-89ab-4cde-8fab-0123456789ab"
        calls = []

        def opener(request, timeout):
            calls.append((request.get_method(), request.full_url, request.get_header("Idempotency-key")))
            if request.get_method() == "POST":
                return FakeResponse({"job_id": job_id, "status": "queued", "duplicate": False, "request_id": "r1"})
            if request.get_method() == "GET":
                return FakeResponse({"job_id": job_id, "ticker": "NVDA", "status": "complete", "attempts": 1, "max_attempts": 3, "result": {"type": "company_snapshot"}, "error": None, "created_at": "2026-01-01T00:00:00Z", "started_at": None, "completed_at": "2026-01-01T00:01:00Z", "retry_at": None, "request_id": "r2"})
            return FakeResponse({"job_id": job_id, "status": "cancelled", "request_id": "r3"})

        client = Client(KEY, opener=opener)
        started = client.start_company_research("NVDA", "request-0001")
        self.assertEqual(started["status"], "queued")
        self.assertEqual(urlparse(calls[0][1]).netloc, "api.tidelight.app")
        self.assertEqual(urlparse(calls[0][1]).path, "/v1/research/jobs")
        self.assertEqual(calls[0][2], "request-0001")
        job = client.get_research_job(job_id)
        self.assertEqual(job.status, "complete")
        self.assertEqual(job.result["type"], "company_snapshot")
        self.assertEqual(client.cancel_research_job(job_id)["status"], "cancelled")

    def test_research_job_validates_before_network(self):
        client = Client(KEY, opener=lambda *_args, **_kwargs: self.fail("transport called"))
        with self.assertRaises(ValueError):
            client.start_company_research("NVDA?", "request-0001")
        with self.assertRaises(ValueError):
            client.start_company_research("NVDA", "short")

    def test_pagination_and_bearer_header(self):
        calls = []

        def opener(request, timeout):
            self.assertEqual(request.get_header("Authorization"), "Bearer " + KEY)
            calls.append(parse_qs(urlparse(request.full_url).query))
            return FakeResponse({"data": [INSTRUMENT], "next_cursor": "RNVDAUSDT" if len(calls) == 1 else None, "generated_at": 1, "request_id": "test"})

        client = Client(KEY, opener=opener)
        self.assertEqual(len(list(client.tokenized_equities())), 2)
        self.assertEqual(calls[1]["cursor"], ["RNVDAUSDT"])

    def test_transient_retry_and_structured_error(self):
        calls = []

        def opener(request, timeout):
            calls.append(1)
            if len(calls) == 1:
                raise HTTPError(request.full_url, 503, "Unavailable", {"Retry-After": "0"}, io.BytesIO(b'{"error":{"code":"provider_unavailable","message":"Retry"}}'))
            return FakeResponse({"data": [], "next_cursor": None, "generated_at": 1, "request_id": "success"})

        client = Client(KEY, opener=opener, sleeper=lambda _: None, max_retries=1)
        self.assertEqual(client.list_tokenized_equities().request_id, "success")
        self.assertEqual(len(calls), 2)

        def denied(request, timeout):
            raise HTTPError(request.full_url, 401, "Denied", {"X-Request-Id": "denied"}, io.BytesIO(b'{"error":{"code":"unauthorized","message":"Invalid key"}}'))

        with self.assertRaises(ApiError) as caught:
            Client(KEY, opener=denied).list_tokenized_equities()
        self.assertEqual(caught.exception.request_id, "denied")
        self.assertNotIn(KEY, str(caught.exception))

    def test_input_validation(self):
        with self.assertRaises(ValueError):
            Client(KEY, base_url="http://example.com/api/v1")
        with self.assertRaises(ValueError):
            Client(KEY, base_url="https://attacker.example/v1")
        with self.assertRaises(ValueError):
            Client(KEY, base_url="https://api.tidelight.app:8443/v1")
        client = Client(KEY, opener=lambda *_args, **_kwargs: self.fail("transport called"))
        with self.assertRaises(ValueError):
            client.list_tokenized_equities(limit=101)
        with self.assertRaises(ValueError):
            client.list_tokenized_equities(cursor="../../etc")
        with self.assertRaises(ValueError):
            client.list_tokenized_equities(underlying_ticker="AAPL?")

    def test_default_transport_does_not_follow_redirects(self):
        seen = []

        class RedirectHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                seen.append(self.path)
                self.send_response(302)
                self.send_header("Location", "https://attacker.example/collect")
                self.end_headers()

            def log_message(self, *_args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), RedirectHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            client = Client(KEY, base_url=f"http://127.0.0.1:{server.server_port}/v1", max_retries=0)
            with self.assertRaises(ApiError) as caught:
                client.list_tokenized_equities()
            self.assertEqual(caught.exception.status, 302)
            self.assertEqual(seen, ["/v1/market/instruments?kind=rtoken&limit=20"])
        finally:
            server.shutdown()
            thread.join(timeout=2)
            server.server_close()

    def test_provider_terms_gate_is_not_retried(self):
        calls = []

        def denied(request, timeout):
            calls.append(request.full_url)
            raise HTTPError(request.full_url, 503, "Unavailable", {}, io.BytesIO(b'{"error":{"code":"provider_terms_unconfirmed","message":"Market redistribution terms are not confirmed."}}'))

        client = Client(KEY, opener=denied, max_retries=3, sleeper=lambda _: None)
        with self.assertRaises(ApiError) as caught:
            client.list_tokenized_equities()
        self.assertEqual(caught.exception.code, "provider_terms_unconfirmed")
        self.assertEqual(len(calls), 1)

    def test_underlying_ticker_is_normalized_and_sent_before_pagination(self):
        calls = []

        def opener(request, timeout):
            calls.append(parse_qs(urlparse(request.full_url).query))
            return FakeResponse({"data": [INSTRUMENT], "next_cursor": None, "generated_at": 1, "request_id": "filter"})

        Client(KEY, opener=opener).list_tokenized_equities(limit=1, underlying_ticker="aapl")
        self.assertEqual(calls[0]["underlying_ticker"], ["AAPL"])

    def test_webhook_management_and_delivery_history(self):
        endpoint_id = "01234567-89ab-4cde-8fab-0123456789ab"
        calls = []

        def opener(request, timeout):
            calls.append((request.get_method(), request.full_url, request.get_header("Authorization"), request.data))
            if request.get_method() == "GET" and request.full_url.endswith("/deliveries"):
                return FakeResponse({"deliveries": [], "request_id": "r5"})
            if request.get_method() == "GET":
                return FakeResponse({"endpoints": [{"id": endpoint_id}], "request_id": "r1"})
            if request.get_method() == "DELETE":
                return FakeResponse({"disabled": True, "request_id": "r4"})
            return FakeResponse({"endpoint": {"id": endpoint_id}, "signing_secret": "shown-once", "request_id": "r2"})

        client = Client(KEY, opener=opener)
        self.assertEqual(client.list_webhooks()["endpoints"][0]["id"], endpoint_id)
        self.assertEqual(client.create_webhook(name="Research", url="https://example.com/hook", events=["research.job.completed"])["signing_secret"], "shown-once")
        self.assertEqual(client.update_webhook(endpoint_id, rotate_secret=True)["signing_secret"], "shown-once")
        self.assertTrue(client.disable_webhook(endpoint_id)["disabled"])
        self.assertEqual(client.list_webhook_deliveries()["deliveries"], [])
        self.assertEqual([call[0] for call in calls], ["GET", "POST", "PATCH", "DELETE", "GET"])
        self.assertTrue(all(call[2] == "Bearer " + KEY for call in calls))

    def test_webhook_input_validation_prevents_requests(self):
        client = Client(KEY, opener=lambda *_args, **_kwargs: self.fail("network should not run"))
        with self.assertRaises(ValueError):
            client.create_webhook(name="x", url="http://example.com/hook", events=["research.job.completed"])
        with self.assertRaises(ValueError):
            client.create_webhook(name="Valid", url="https://example.com/hook", events=["unknown.event"])
        with self.assertRaises(ValueError):
            client.update_webhook("../invalid", enabled=False)
        with self.assertRaises(ValueError):
            client.update_webhook("01234567-89ab-4cde-8fab-0123456789ab", rotate_secret=False)

    def test_webhook_mutation_does_not_retry_without_idempotency_support(self):
        calls = []

        def unavailable(request, timeout):
            calls.append(1)
            raise HTTPError(request.full_url, 503, "Unavailable", {}, io.BytesIO(b'{"error":{"code":"service_unavailable","message":"Try later"}}'))

        client = Client(KEY, opener=unavailable, max_retries=3)
        with self.assertRaises(ApiError) as caught:
            client.create_webhook(name="Research", url="https://example.com/hook", events=["research.job.completed"])
        self.assertEqual(caught.exception.code, "service_unavailable")
        self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
