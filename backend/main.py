"""
BattlePass Steam Plugin - Backend API Gateway
"""

import json
import urllib.request
import urllib.error
import Millennium

API_BASE = "https://profile.battlepass.ru"
ORG = "extension"

# Token storage
_token = None

def _make_request(endpoint, method="GET", body=None):
    """Make HTTP request to BattlePass API"""
    global _token
    url = f"{API_BASE}{endpoint}"

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "BattlePass-Steam-Plugin/1.0"
    }

    if _token:
        headers["Authorization"] = f"Bearer {_token}"

    data = None
    if body and method != "GET":
        data = json.dumps(body).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        response = urllib.request.urlopen(req, timeout=30)
        result = json.loads(response.read().decode("utf-8"))
        return result
    except urllib.error.HTTPError as e:
        Millennium.logger.error(f"[BP] HTTP {e.code}")
        return {"error": f"HTTP {e.code}"}
    except Exception as e:
        Millennium.logger.error(f"[BP] Error: {str(e)}")
        return {"error": str(e)}


# API Functions - called from frontend via Millennium.callServerMethod()

def auth_steam(steam_id64: str, username: str):
    """Authenticate with Steam"""
    global _token
    Millennium.logger.log(f"[BP] auth_steam: {steam_id64}, {username}")
    result = _make_request(
        "/api/v2/user/auth/steam",
        "POST",
        {"steamId64": steam_id64 or "76561198000000000", "username": username or ""}
    )
    if "access_token" in result:
        _token = result["access_token"]
        Millennium.logger.log("[BP] Auth OK")
    return json.dumps(result)


def get_payment_methods():
    """Get payment methods"""
    Millennium.logger.log("[BP] get_payment_methods")
    result = _make_request(f"/api/v2/payment/bills/steam?org={ORG}")
    return json.dumps(result)


def calculate_commission(amount: int, method_name: str, currency: str, account: str, promocode: str):
    """Calculate commission"""
    Millennium.logger.log(f"[BP] calculate_commission: {amount}")
    result = _make_request(
        f"/api/v2/payment/comission?org={ORG}",
        "POST",
        {
            "amount": int(amount) if amount else 0,
            "account": account or "",
            "currency": (currency or "rub").lower(),
            "type": 0,
            "isIncludeCommission": False,
            "billType": 0,
            "tag": method_name or "",
            "promocode": promocode or ""
        }
    )
    return json.dumps(result)


def validate_promocode(code: str, account: str):
    """Validate promocode"""
    Millennium.logger.log(f"[BP] validate_promocode: {code}")
    result = _make_request(
        f"/api/v2/payment/validate?org={ORG}",
        "POST",
        {"code": (code or "").upper(), "account": account or "test"}
    )
    return json.dumps(result)


def convert_currency(amount: int, from_currency: str, to_currency: str, account: str):
    """Convert currency"""
    Millennium.logger.log(f"[BP] convert_currency: {amount} {from_currency} -> {to_currency}")
    result = _make_request(
        f"/api/v2/payment/convert?org={ORG}",
        "POST",
        {
            "amount": int(amount) if amount else 0,
            "account": account or "test",
            "type": 1,
            "isIncludeCommission": True,
            "billType": 1,
            "inputCurrency": (from_currency or "kzt").lower(),
            "outputCurrency": (to_currency or "rub").lower()
        }
    )
    return json.dumps(result)


def create_order(amount: int, method_name: str, currency: str, account: str, promocode: str):
    """Create order"""
    Millennium.logger.log(f"[BP] create_order: {amount} {currency} via {method_name}")
    input_values = [
        {"name": "account", "value": account or ""},
        {"name": "amount", "value": str(amount)},
        {"name": "currency", "value": (currency or "rub").lower()}
    ]
    if promocode:
        input_values.append({"name": "promocode", "value": promocode.upper()})

    result = _make_request(
        f"/api/v2/payment/create?org={ORG}",
        "POST",
        {
            "productId": "1",
            "tag": method_name,
            "service": "steam",
            "productType": "DIRECT_PAYMENT",
            "region": {"name": "Россия", "value": "RU"},
            "inputValues": input_values
        }
    )
    return json.dumps(result)


# Plugin lifecycle class
class Plugin:
    def _front_end_loaded(self):
        pass

    def _load(self):
        Millennium.logger.log("[BP] Backend loaded")
        Millennium.ready()  # Required to tell Millennium backend is ready

    def _unload(self):
        Millennium.logger.log("[BP] Backend unloaded")
