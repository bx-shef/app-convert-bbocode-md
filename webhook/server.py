"""
Tiny deploy webhook listener.

Authenticates POSTs by header `X-Deploy-Token` (constant-time compared against
$DEPLOY_HOOK_TOKEN). On success runs the script registered for the request
path and returns its exit code in the body.

Why this and not adnanh/webhook? Same shape, ~30 lines, no extra image to
trust, easy to delete when we move to Watchtower.
"""
import hmac
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

TOKEN = os.environ['DEPLOY_HOOK_TOKEN']
HOOKS = {
    '/hooks/redeploy-convert-bbocode-md': '/scripts/redeploy-convert-bbocode-md.sh'
}


class Handler(BaseHTTPRequestHandler):
    def _reply(self, code: int, body: bytes = b'') -> None:
        self.send_response(code)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        sent = (self.headers.get('X-Deploy-Token') or '').encode()
        if not hmac.compare_digest(sent, TOKEN.encode()):
            return self._reply(401)
        script = HOOKS.get(self.path)
        if not script:
            return self._reply(404)
        proc = subprocess.run(['/bin/sh', script], capture_output=True, timeout=300)
        sys.stdout.write(proc.stdout.decode(errors='replace'))
        sys.stderr.write(proc.stderr.decode(errors='replace'))
        sys.stdout.flush()
        body = f'rc={proc.returncode}\n'.encode()
        self._reply(200 if proc.returncode == 0 else 500, body)

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write(f'{self.address_string()} {fmt % args}\n')


if __name__ == '__main__':
    HTTPServer(('0.0.0.0', 9000), Handler).serve_forever()
