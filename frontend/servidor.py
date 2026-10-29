"""Servidor de desenvolvimento do painel.

Serve os arquivos estáticos e repassa /api/* para o backend DAC4GIL.Presentation, assim o
navegador vê tudo na mesma origem e o backend não precisa de CORS.

Uso: python3 servidor.py [porta] [url_do_backend]
     python3 servidor.py 8080 http://localhost:5247
"""
import http.server
import os
import sys
import urllib.error
import urllib.request

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
BACKEND = (sys.argv[2] if len(sys.argv) > 2 else os.environ.get("DAC_BACKEND", "http://localhost:5247")).rstrip("/")
PASTA = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PASTA, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.repassar()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self.repassar()
        self.send_error(405)

    def repassar(self):
        tamanho = int(self.headers.get("Content-Length") or 0)
        corpo = self.rfile.read(tamanho) if tamanho else None
        cabecalhos = {k: v for k, v in self.headers.items() if k.lower() in ("content-type", "accept")}
        pedido = urllib.request.Request(BACKEND + self.path, data=corpo, headers=cabecalhos, method=self.command)
        try:
            with urllib.request.urlopen(pedido, timeout=60) as resp:
                status, tipo, dados = resp.status, resp.headers.get("Content-Type"), resp.read()
        except urllib.error.HTTPError as e:
            status, tipo, dados = e.code, e.headers.get("Content-Type"), e.read()
        except (urllib.error.URLError, OSError) as e:
            status, tipo, dados = 502, "text/plain; charset=utf-8", f"Backend indisponível em {BACKEND}: {e}".encode()
        self.send_response(status)
        if tipo:
            self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)


if __name__ == "__main__":
    print(f"Painel em http://localhost:{PORTA}  ·  /api → {BACKEND}")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORTA), Handler).serve_forever()
