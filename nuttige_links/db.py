import sqlite3

import click
from flask import current_app, g
from flask.cli import with_appcontext
from pathlib import Path


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(
            current_app.config["DATABASE"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    schema = Path(__file__).parent / "schema.sql"
    db.executescript(schema.read_text())


@click.command("init-db")
@with_appcontext
def init_db_command():
    """Drop all tables and recreate from schema."""
    init_db()
    click.echo("Initialized the database.")


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
