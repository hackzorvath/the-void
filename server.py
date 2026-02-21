#!/usr/bin/env python3
import http.server
import socketserver
import os
from pathlib import Path

PORT = 8000

# Cache the 404 page in memory
_404_CONTENT = None

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global _404_CONTENT
        
        # Normalize the path
        path = self.translate_path(self.path)
        
        # Check if the file exists
        if not os.path.isfile(path):
            # If it's a directory, try to serve index.html
            if os.path.isdir(path):
                index_path = os.path.join(path, "index.html")
                if os.path.isfile(index_path):
                    self.path = self.path.rstrip('/') + '/index.html'
                    return super().do_GET()
            
            # Serve 404.html for missing files
            if _404_CONTENT is None:
                try:
                    with open("404.html", "rb") as f:
                        _404_CONTENT = f.read()
                except:
                    _404_CONTENT = b"<html><body><h1>404 - File Not Found</h1></body></html>"
            
            self.send_response(404)
            self.send_header("Content-type", "text/html")
            self.send_header("Content-Length", len(_404_CONTENT))
            self.end_headers()
            self.wfile.write(_404_CONTENT)
            return
        
        # Serve the file normally
        return super().do_GET()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🏴‍☠️  Serving on http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        httpd.serve_forever()
