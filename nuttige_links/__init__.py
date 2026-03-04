from pathlib import Path
from flask import Flask


def create_app():
    app = Flask(__name__)
    instance_path = Path(app.instance_path)
    instance_path.mkdir(parents=True, exist_ok=True)
    app.config["DATABASE"] = instance_path / "nuttige_links.sqlite"

    from nuttige_links import db

    db.init_app(app)

    from nuttige_links.blueprints import api

    app.register_blueprint(api.bp)

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    @app.route("/local")
    def personal():
        return app.send_static_file("local.html")

    return app
