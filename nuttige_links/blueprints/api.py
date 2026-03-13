import asyncio
import httpx
from flask import Blueprint, request
from flask.views import MethodView

from nuttige_links.db import get_db

bp = Blueprint("api", __name__, url_prefix="/api")


# =============================================================================
# GENERIC CRUD
# =============================================================================


class GenericAPI(MethodView):
    MANAGED_FIELDS = {"created_at", "updated_at"}

    def post(self, table: str, action: str):
        self.table = table
        match action:
            case "load":
                return self.load()
            case "save":
                permissions = request.headers.get(
                    "X-Permissions", "").split(",")
                if "editor" not in permissions:
                    return {"error": "forbidden"}, 403
                return self.save()

    def load(self):
        db = get_db()
        rows = db.execute(f"SELECT * FROM {self.table}").fetchall()
        return {"records": [dict(row) for row in rows]}

    def save(self):
        data = request.get_json()
        db = get_db()

        for record in data.get("upserts", []):
            record = {k: v for k, v in record.items(
            ) if k not in self.MANAGED_FIELDS}
            columns, values = zip(*record.items())
            placeholders = ", ".join("?" for _ in columns)
            columns_str = ", ".join(columns)

            update_parts = [
                f"{col} = excluded.{col}"
                for col in columns
                if col not in ("id", "created_at")
            ]
            update_clause = ", ".join(update_parts)

            sql = f"""
                INSERT INTO {self.table} ({columns_str})
                VALUES ({placeholders})
                ON CONFLICT(id) DO UPDATE SET {update_clause}
            """
            db.execute(sql, values)

        for id in data.get("deletes", []):
            db.execute(f"DELETE FROM {self.table} WHERE id = ?", (id,))

        db.commit()

        saved_ids = [r["id"] for r in data.get("upserts", [])]
        if saved_ids:
            placeholders = ",".join("?" * len(saved_ids))
            rows = db.execute(
                f"SELECT * FROM {
                    self.table} WHERE id IN ({placeholders})", saved_ids
            ).fetchall()
            return {"status": "ok", "records": [dict(row) for row in rows]}

        return {"status": "ok", "records": []}


bp.add_url_rule(
    "/<table>/<action>",
    view_func=GenericAPI.as_view("generic_api"),
    methods=["POST"],
)


# =============================================================================
# LINK CHECKER
# =============================================================================

CHECK_TIMEOUT = 10
CHECK_MAX_CONCURRENT = 20


async def check_single(client, link_id, url):
    try:
        response = await client.head(
            url,
            follow_redirects=True,
            timeout=CHECK_TIMEOUT,
        )
        if response.status_code >= 400:
            response = await client.get(
                url, follow_redirects=True, timeout=CHECK_TIMEOUT
            )
        return link_id, response.status_code
    except httpx.TimeoutException:
        return link_id, 408
    except httpx.RequestError:
        return link_id, 0


async def check_all(links):
    semaphore = asyncio.Semaphore(CHECK_MAX_CONCURRENT)

    async def bounded_check(client, link_id, url):
        async with semaphore:
            return await check_single(client, link_id, url)

    async with httpx.AsyncClient() as client:
        tasks = [bounded_check(client, lid, url) for lid, url in links]
        return await asyncio.gather(*tasks)


@bp.route("/links/check", methods=["POST"])
def check_links():
    permissions = request.headers.get("X-Permissions", "").split(",")
    if "editor" not in permissions:
        return {"error": "forbidden"}, 403

    db = get_db()

    data = request.get_json() or {}
    link_ids = data.get("ids")

    if link_ids:
        placeholders = ",".join("?" * len(link_ids))
        rows = db.execute(
            f"SELECT id, url FROM links WHERE id IN ({placeholders})", link_ids
        ).fetchall()
    else:
        rows = db.execute("SELECT id, url FROM links").fetchall()

    links = [(row["id"], row["url"]) for row in rows]
    if not links:
        return {"status": "ok", "results": []}

    results = asyncio.run(check_all(links))

    for link_id, status_code in results:
        db.execute(
            "UPDATE links "
            "SET last_checked = CURRENT_TIMESTAMP, last_status = ? "
            "WHERE id = ?",
            (status_code, link_id),
        )
    db.commit()

    checked_ids = [r[0] for r in results]
    placeholders = ",".join("?" * len(checked_ids))
    updated = db.execute(
        f"SELECT * FROM links WHERE id IN ({placeholders})", checked_ids
    ).fetchall()

    return {
        "status": "ok",
        "records": [dict(row) for row in updated],
    }
