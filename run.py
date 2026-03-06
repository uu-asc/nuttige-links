from waitress import serve
from nuttige_links import create_app

serve(create_app(), host="127.0.0.1", port=5001)
