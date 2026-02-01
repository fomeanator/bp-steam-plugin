"""
BattlePass Steam Plugin - Backend API Gateway
Handles API requests to bypass CORS restrictions in Steam webkit
"""

import Millennium
import json
import urllib.request
import urllib.error
import ssl

API_BASE = "https://profile.battlepass.ru"
ORG = "extension"

# SSL context that doesn't verify certificates (needed for some systems)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

class Plugin:
    token = None

    def _api_request(self, endpoint: str, method: str = "GET", body: dict = None, token: str = None) -> dict:
        """Make HTTP request to BattlePass API"""
        url = f"{API_BASE}{endpoint}"

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "BattlePass-Steam-Plugin/1.0"
        }

        if token:
            headers["Authorization"] = f"Bearer {token}"

        data = None
        if body and method != "GET":
            data = json.dumps(body).encode("utf-8")

        try:
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(req, context=ssl_context, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            Millennium.logger.error(f"[BattlePass] HTTP Error {e.code}: {error_body[:200]}")
            raise Exception(f"API Error: {e.code}")
        except urllib.error.URLError as e:
            Millennium.logger.error(f"[BattlePass] URL Error: {e.reason}")
            raise Exception(f"Network Error: {e.reason}")
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Request Error: {str(e)}")
            raise

    def auth_steam(self, steam_id64: str, username: str) -> str:
        """Authenticate with Steam credentials"""
        try:
            data = self._api_request(
                "/api/v2/user/auth/steam",
                "POST",
                {"steamId64": steam_id64 or "76561198000000000", "username": username or ""}
            )
            self.token = data.get("access_token")
            Millennium.logger.log(f"[BattlePass] Auth success, token: {self.token[:20] if self.token else 'None'}...")
            return json.dumps(data)
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Auth failed: {str(e)}")
            return json.dumps({"error": str(e)})

    def get_payment_methods(self) -> str:
        """Get available payment methods"""
        try:
            data = self._api_request(
                f"/api/v2/payment/bills/steam?org={ORG}",
                "GET",
                None,
                self.token
            )
            Millennium.logger.log(f"[BattlePass] Got {len(data)} payment methods")
            return json.dumps(data)
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Get methods failed: {str(e)}")
            return json.dumps({"error": str(e)})

    def calculate_commission(self, amount: int, method_name: str, currency: str, account: str, promocode: str) -> str:
        """Calculate payment commission"""
        try:
            data = self._api_request(
                f"/api/v2/payment/comission?org={ORG}",
                "POST",
                {
                    "amount": amount,
                    "account": account or "",
                    "currency": currency.lower(),
                    "type": 0,
                    "isIncludeCommission": False,
                    "billType": 0,
                    "tag": method_name,
                    "promocode": promocode or ""
                },
                self.token
            )
            return json.dumps(data)
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Commission failed: {str(e)}")
            return json.dumps({"error": str(e)})

    def validate_promocode(self, code: str, account: str) -> str:
        """Validate promocode"""
        try:
            data = self._api_request(
                f"/api/v2/payment/validate?org={ORG}",
                "POST",
                {"code": code.upper(), "account": account or "test"},
                self.token
            )
            return json.dumps(data)
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Promocode validation failed: {str(e)}")
            return json.dumps({"error": str(e), "discount": 0})

    def convert_currency(self, amount: int, from_currency: str, to_currency: str, account: str) -> str:
        """Convert currency"""
        try:
            data = self._api_request(
                f"/api/v2/payment/convert?org={ORG}",
                "POST",
                {
                    "amount": amount,
                    "account": account or "test",
                    "type": 1,
                    "isIncludeCommission": True,
                    "billType": 1,
                    "inputCurrency": from_currency.lower(),
                    "outputCurrency": to_currency.lower()
                },
                self.token
            )
            return json.dumps(data)
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Convert failed: {str(e)}")
            return json.dumps({"error": str(e)})

    def create_order(self, amount: int, method_name: str, currency: str, account: str, promocode: str) -> str:
        """Create payment order"""
        try:
            input_values = [
                {"name": "account", "value": account},
                {"name": "amount", "value": str(amount)},
                {"name": "currency", "value": currency.lower()}
            ]

            if promocode:
                input_values.append({"name": "promocode", "value": promocode.upper()})

            data = self._api_request(
                f"/api/v2/payment/create?org={ORG}",
                "POST",
                {
                    "productId": "1",
                    "tag": method_name,
                    "service": "steam",
                    "productType": "DIRECT_PAYMENT",
                    "region": {"name": "Россия", "value": "RU"},
                    "inputValues": input_values
                },
                self.token
            )
            Millennium.logger.log(f"[BattlePass] Order created: {data.get('paymentUrl', 'no url')[:50]}")
            return json.dumps(data)
        except Exception as e:
            Millennium.logger.error(f"[BattlePass] Create order failed: {str(e)}")
            return json.dumps({"error": str(e)})

    def _front_end_loaded(self):
        """Called when frontend loads"""
        Millennium.logger.log("[BattlePass] Frontend loaded")

    def _load(self):
        """Called when plugin loads"""
        Millennium.logger.log("[BattlePass] Backend loaded")

    def _unload(self):
        """Called when plugin unloads"""
        Millennium.logger.log("[BattlePass] Backend unloaded")
