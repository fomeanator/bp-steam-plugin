#!/usr/bin/env python3
"""
BattlePass CORS Proxy - запускать перед Steam
"""
import http.server
import socketserver
import threading
import sys
from urllib.error import URLError
from urllib.request import HTTPErrorProcessor, Request, build_opener

PORT = 8793

class NoExceptionErrorProcessor(HTTPErrorProcessor):
    def http_response(self, request, response):
        code = getattr(response, 'status', None) or response.getcode()
        if code and 300 <= code < 400:
            return HTTPErrorProcessor.http_response(self, request, response)
        return response
    https_response = http_response

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self): self._handle()
    def do_POST(self): self._handle()
    def do_PUT(self): self._handle()
    def do_DELETE(self): self._handle()

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')

    def _handle(self):
        try:
            if not self.path.startswith('/proxy/'):
                self.send_response(404)
                self._cors()
                self.end_headers()
                self.wfile.write(b'Use /proxy/URL')
                return

            url = self.path[7:]
            if not url.startswith('http'):
                url = 'https://' + url

            headers = {k: v for k, v in self.headers.items()
                      if k.lower() not in ('host', 'connection', 'origin')}

            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else None

            req = Request(url, data=body, headers=headers, method=self.command)
            opener = build_opener(NoExceptionErrorProcessor())
            resp = opener.open(req, timeout=30)

            self.send_response(resp.status)
            self._cors()

            data = resp.read()
            for h, v in resp.getheaders():
                if h.lower() not in ('access-control-allow-origin', 'transfer-encoding', 'content-length'):
                    self.send_header(h, v)
            self.send_header('Content-Length', len(data))
            self.end_headers()
            self.wfile.write(data)

        except Exception as e:
            self.send_response(500)
            self._cors()
            msg = str(e).encode()
            self.send_header('Content-Length', len(msg))
            self.end_headers()
            self.wfile.write(msg)

    def log_message(self, *args): pass

if __name__ == '__main__':
    print(f'''
╔══════════════════════════════════════════╗
║   BattlePass CORS Proxy                  ║
║   Порт: {PORT}                              ║
║   НЕ ЗАКРЫВАЙ ЭТО ОКНО!                  ║
╚══════════════════════════════════════════╝
''')

    with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), ProxyHandler) as server:
        server.allow_reuse_address = True
        print(f'[OK] Прокси запущен на http://127.0.0.1:{PORT}')
        print('[OK] Теперь открой Steam и используй плагин')
        print('[!] Для остановки нажми Ctrl+C')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\n[!] Остановка...')
            sys.exit(0)
