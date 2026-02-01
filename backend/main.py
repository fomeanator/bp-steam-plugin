# pylint: disable=invalid-name
"""
BattlePass Steam Plugin - Backend
"""

import json
import urllib.request
import urllib.error
import Millennium

API_BASE = "https://profile.battlepass.ru"
ORG = "extension"
_token = None


def _make_request(endpoint, method="GET", body=None):
    global _token
    url = f"{API_BASE}{endpoint}"
    headers = {"Content-Type": "application/json", "User-Agent": "BattlePass/1.0"}
    if _token:
        headers["Authorization"] = f"Bearer {_token}"

    data = json.dumps(body).encode("utf-8") if body and method != "GET" else None

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        response = urllib.request.urlopen(req, timeout=30)
        return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        Millennium.logger.error(f"[BP] {str(e)}")
        return {"error": str(e)}


def auth_steam(steam_id64, username):
    global _token
    result = _make_request("/api/v2/user/auth/steam", "POST",
        {"steamId64": steam_id64 or "76561198000000000", "username": username or ""})
    if "access_token" in result:
        _token = result["access_token"]
    return json.dumps(result)


def get_payment_methods():
    return json.dumps(_make_request(f"/api/v2/payment/bills/steam?org={ORG}"))


def calculate_commission(amount, method_name, currency, account, promocode):
    return json.dumps(_make_request(f"/api/v2/payment/comission?org={ORG}", "POST", {
        "amount": int(amount or 0), "account": account or "", "currency": (currency or "rub").lower(),
        "type": 0, "isIncludeCommission": False, "billType": 0, "tag": method_name or "", "promocode": promocode or ""
    }))


def validate_promocode(code, account):
    return json.dumps(_make_request(f"/api/v2/payment/validate?org={ORG}", "POST",
        {"code": (code or "").upper(), "account": account or "test"}))


def convert_currency(amount, from_currency, to_currency, account):
    return json.dumps(_make_request(f"/api/v2/payment/convert?org={ORG}", "POST", {
        "amount": int(amount or 0), "account": account or "test", "type": 1, "isIncludeCommission": True,
        "billType": 1, "inputCurrency": (from_currency or "kzt").lower(), "outputCurrency": (to_currency or "rub").lower()
    }))


def create_order(amount, method_name, currency, account, promocode):
    input_values = [{"name": "account", "value": account or ""}, {"name": "amount", "value": str(amount)},
                    {"name": "currency", "value": (currency or "rub").lower()}]
    if promocode:
        input_values.append({"name": "promocode", "value": promocode.upper()})
    return json.dumps(_make_request(f"/api/v2/payment/create?org={ORG}", "POST", {
        "productId": "1", "tag": method_name, "service": "steam", "productType": "DIRECT_PAYMENT",
        "region": {"name": "Россия", "value": "RU"}, "inputValues": input_values
    }))


class Plugin:
    def _load(self):
        Millennium.logger.log("[BP] Loaded")
        Millennium.ready()

    def _unload(self):
        Millennium.logger.log("[BP] Unloaded")
