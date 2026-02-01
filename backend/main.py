"""
BattlePass Steam Plugin - Backend API Gateway
"""

import Millennium
import json
import urllib.request
import urllib.error

API_BASE = "https://profile.battlepass.ru"
ORG = "extension"

class Plugin:
    token = None

    def _make_request(self, endpoint, method="GET", body=None):
        """Make HTTP request to BattlePass API"""
        url = f"{API_BASE}{endpoint}"

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "BattlePass-Steam-Plugin/1.0"
        }

        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

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

    def auth_steam(self, steam_id64, username):
        """Authenticate with Steam"""
        Millennium.logger.log(f"[BP] auth_steam called")
        result = self._make_request(
            "/api/v2/user/auth/steam",
            "POST",
            {"steamId64": steam_id64 or "76561198000000000", "username": username or ""}
        )
        if "access_token" in result:
            self.token = result["access_token"]
            Millennium.logger.log(f"[BP] Auth OK")
        return json.dumps(result)

    def get_payment_methods(self):
        """Get payment methods"""
        Millennium.logger.log(f"[BP] get_payment_methods called")
        result = self._make_request(f"/api/v2/payment/bills/steam?org={ORG}")
        return json.dumps(result)

    def calculate_commission(self, amount, method_name, currency, account, promocode):
        """Calculate commission"""
        result = self._make_request(
            f"/api/v2/payment/comission?org={ORG}",
            "POST",
            {
                "amount": int(amount),
                "account": account or "",
                "currency": currency.lower() if currency else "rub",
                "type": 0,
                "isIncludeCommission": False,
                "billType": 0,
                "tag": method_name or "",
                "promocode": promocode or ""
            }
        )
        return json.dumps(result)

    def validate_promocode(self, code, account):
        """Validate promocode"""
        result = self._make_request(
            f"/api/v2/payment/validate?org={ORG}",
            "POST",
            {"code": (code or "").upper(), "account": account or "test"}
        )
        return json.dumps(result)

    def convert_currency(self, amount, from_currency, to_currency, account):
        """Convert currency"""
        result = self._make_request(
            f"/api/v2/payment/convert?org={ORG}",
            "POST",
            {
                "amount": int(amount),
                "account": account or "test",
                "type": 1,
                "isIncludeCommission": True,
                "billType": 1,
                "inputCurrency": from_currency.lower() if from_currency else "kzt",
                "outputCurrency": to_currency.lower() if to_currency else "rub"
            }
        )
        return json.dumps(result)

    def create_order(self, amount, method_name, currency, account, promocode):
        """Create order"""
        input_values = [
            {"name": "account", "value": account},
            {"name": "amount", "value": str(amount)},
            {"name": "currency", "value": currency.lower() if currency else "rub"}
        ]
        if promocode:
            input_values.append({"name": "promocode", "value": promocode.upper()})

        result = self._make_request(
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

    def _load(self):
        Millennium.logger.log("[BP] Backend loaded")

    def _unload(self):
        Millennium.logger.log("[BP] Backend unloaded")
