import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_api_notifications_recent_with_and_without_authentication():
    session = requests.Session()
    auth_endpoint = f"{BASE_URL}/api/auth/callback/credentials"
    notifications_endpoint = f"{BASE_URL}/api/notifications/recent"
    credentials = {"username": "admin", "password": "PinoSys@12#34"}

    # Step 1: Obtain authentication token/session by logging in
    try:
        auth_resp = session.post(
            auth_endpoint,
            json={"email": credentials["username"], "password": credentials["password"]},
            timeout=TIMEOUT,
        )
        assert auth_resp.status_code == 200, f"Auth login failed with status {auth_resp.status_code}"
    except requests.RequestException as e:
        assert False, f"Exception during authentication request: {e}"

    # Step 2: Access /api/notifications/recent with valid authenticated session
    try:
        resp = session.get(notifications_endpoint, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK with auth, got {resp.status_code}"
        json_data = resp.json()
        assert isinstance(json_data, list), "Notification response is not a list"
    except requests.RequestException as e:
        assert False, f"Exception during authenticated notifications request: {e}"
    except ValueError:
        assert False, "Response is not JSON for authenticated notifications request"

    # Step 3: Access /api/notifications/recent without authentication
    try:
        resp_no_auth = requests.get(notifications_endpoint, timeout=TIMEOUT)
        # Expecting 401 Unauthorized or redirect (status 3xx) to /login
        assert resp_no_auth.status_code in (401, 302, 303, 307, 308), \
            f"Expected 401 or redirect without auth, got {resp_no_auth.status_code}"
        if resp_no_auth.status_code in (302, 303, 307, 308):
            location = resp_no_auth.headers.get("Location", "")
            assert "/login" in location, f"Redirect location does not point to login: {location}"
    except requests.RequestException as e:
        assert False, f"Exception during unauthenticated notifications request: {e}"

    # Step 4: Access /api/notifications/recent with invalid authentication (bad token/session)
    try:
        # Corrupt the session cookies or auth headers to simulate invalid auth
        invalid_session = requests.Session()
        # Add invalid or expired auth token or cookie header (simulate)
        invalid_session.headers.update({"Authorization": "Bearer invalidtoken123"})
        resp_invalid_auth = invalid_session.get(notifications_endpoint, timeout=TIMEOUT)
        # Expecting 401 Unauthorized or redirect to login
        assert resp_invalid_auth.status_code in (401, 302, 303, 307, 308), \
            f"Expected 401 or redirect with invalid auth, got {resp_invalid_auth.status_code}"
        if resp_invalid_auth.status_code in (302, 303, 307, 308):
            location = resp_invalid_auth.headers.get("Location", "")
            assert "/login" in location, f"Redirect location does not point to login for invalid auth: {location}"
    except requests.RequestException as e:
        assert False, f"Exception during invalid authenticated notifications request: {e}"

test_get_api_notifications_recent_with_and_without_authentication()