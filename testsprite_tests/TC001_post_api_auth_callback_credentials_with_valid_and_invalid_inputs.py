import requests

BASE_URL = "http://localhost:3000"
ENDPOINT = "/api/auth/callback/credentials"
TIMEOUT = 30

def test_post_api_auth_callback_credentials_with_valid_and_invalid_inputs():
    url = BASE_URL + ENDPOINT
    headers = {
        "Content-Type": "application/json"
    }

    # Valid credentials payload (using email as username since PRD mentions email and password)
    valid_payload = {
        "email": "admin@example.com",
        "password": "PinoSys@12#34"
    }

    # Note: The PRD user flow shows email + password but the instruction credential uses username.
    # So testing the endpoint with valid email/password as mentioned in PRD user flows.
    # Since the credential provided is username: "admin", password: "PinoSys@12#34"
    # We do both attempts: valid using "admin" as email and also invalid cases.

    # Try valid email/password authentication
    valid_data = {
        "email": "admin@example.com",
        "password": "PinoSys@12#34"
    }
    try:
        response_valid = requests.post(url, json=valid_data, headers=headers, timeout=TIMEOUT)
        assert response_valid.status_code == 200, f"Expected 200 for valid credentials, got {response_valid.status_code}"
        # Check that response contains a session or JWT token (common fields: token, accessToken, or cookie headers)
        json_response = response_valid.json()
        assert ("token" in json_response or "accessToken" in json_response or "session" in json_response or response_valid.cookies), \
            "No authentication token/session returned on valid login"
    except Exception as e:
        assert False, f"Valid login request failed with exception: {e}"

    # Try invalid credentials authentication
    invalid_data = {
        "email": "invaliduser@example.com",
        "password": "wrongpassword"
    }
    try:
        response_invalid = requests.post(url, json=invalid_data, headers=headers, timeout=TIMEOUT)
        assert response_invalid.status_code in (401, 403), f"Expected 401 or 403 for invalid credentials, got {response_invalid.status_code}"
    except Exception as e:
        assert False, f"Invalid login request failed with exception: {e}"

test_post_api_auth_callback_credentials_with_valid_and_invalid_inputs()