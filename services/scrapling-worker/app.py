import json
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

from scrapling.fetchers import Fetcher, StealthyFetcher

API_KEY = os.getenv("SCRAPLING_WORKER_API_KEY", "").strip()
HOST = os.getenv("SCRAPLING_WORKER_HOST", "0.0.0.0")
PORT = int(os.getenv("SCRAPLING_WORKER_PORT", "8787"))
MAX_RESULTS = int(os.getenv("SCRAPLING_MAX_RESULTS", "50"))
FETCH_TIMEOUT = float(os.getenv("SCRAPLING_FETCH_TIMEOUT", "12"))

BLOCKED_DOMAINS = {
    "google.com", "bing.com", "duckduckgo.com", "facebook.com", "instagram.com",
    "linkedin.com", "youtube.com", "yelp.com", "yellowpages.com", "tripadvisor.com",
    "wikipedia.org", "reddit.com", "pinterest.com", "indeed.com", "glassdoor.com",
}
BLOCKED_PATHS = re.compile(r"/(jobs?|careers?|vacancies|blog|article|news|directory|listing|forum|search)(/|$)", re.I)
BAD_TITLES = re.compile(r"\b(best|top|list|directory|guide|roundup|article|companies|jobs?|careers?|vacanc(?:y|ies)|hiring|recruitment|how to|strategy)\b", re.I)
BUSINESS_EMAIL_BLOCKLIST = {"gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com"}
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d .()\-]{7,}\d)(?!\d)")


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_url(url, base=None):
    try:
        value = urljoin(base or "https://example.com", url)
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"}:
            return ""
        return value.split("#", 1)[0]
    except Exception:
        return ""


def domain(url):
    try:
        return urlparse(url).hostname.replace("www.", "").lower()
    except Exception:
        return ""


def is_blocked_url(url):
    host = domain(url)
    if not host or any(host == item or host.endswith("." + item) for item in BLOCKED_DOMAINS):
        return True
    try:
        return bool(BLOCKED_PATHS.search(urlparse(url).path))
    except Exception:
        return True


def fetch_page(url, stealth=False):
    try:
        if stealth:
            return StealthyFetcher.fetch(url, headless=True, network_idle=False, timeout=FETCH_TIMEOUT)
        return Fetcher.get(url, timeout=FETCH_TIMEOUT, stealthy_headers=True)
    except Exception:
        return None


def extract_search_results(page):
    results = []
    for selector in (
        "li.b_algo h2 a",
        "a.result__a",
        "a.result-link",
        "h3 a",
    ):
        try:
            for anchor in page.css(selector):
                href = normalize_url(anchor.attrib.get("href", ""))
                title = clean_text(anchor.text)
                if href and title and not is_blocked_url(href) and not BAD_TITLES.search(title):
                    results.append({"url": href, "title": title})
        except Exception:
            continue
    unique = []
    seen = set()
    for item in results:
        key = domain(item["url"])
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique[:MAX_RESULTS]


def search_web(query):
    encoded = quote_plus(query)
    engines = [
        f"https://www.bing.com/search?q={encoded}&count=30",
        f"https://html.duckduckgo.com/html/?q={encoded}",
        f"https://www.google.com/search?q={encoded}&num=30",
    ]
    for url in engines:
        page = fetch_page(url)
        if not page:
            continue
        results = extract_search_results(page)
        if results:
            return results
    return []


def discover_contact_links(page, base_url):
    links = []
    try:
        for anchor in page.css("a"):
            href = normalize_url(anchor.attrib.get("href", ""), base_url)
            text = clean_text(anchor.text).lower()
            if not href:
                raw = anchor.attrib.get("href", "")
                if raw.lower().startswith("mailto:") or raw.lower().startswith("tel:"):
                    href = raw
            if href and ("contact" in text or "about" in text or "/contact" in href.lower() or "/about" in href.lower()):
                links.append(href)
    except Exception:
        pass
    return list(dict.fromkeys(links))[:3]


def extract_lead(result, requested_location):
    url = result["url"]
    page = fetch_page(url)
    if not page:
        page = fetch_page(url, stealth=True)
    if not page:
        return None

    title = ""
    try:
        title = clean_text(page.css("title::text").get())
    except Exception:
        pass
    name = title.split("|")[0].split("–")[0].split("-")[0].strip() if title else result["title"]
    name = clean_text(name)[:120]
    if not name or BAD_TITLES.search(name):
        name = clean_text(result["title"])[:120]
    if not name or BAD_TITLES.search(name):
        return None

    emails = set()
    phones = set()
    social = {}
    whatsapp = None
    try:
        body = clean_text(page.text)
        emails.update(EMAIL_RE.findall(body))
        phones.update(PHONE_RE.findall(body))
        for anchor in page.css("a"):
            href = anchor.attrib.get("href", "")
            low = href.lower()
            if low.startswith("mailto:"):
                emails.add(href.split(":", 1)[1].split("?", 1)[0])
            if low.startswith("tel:"):
                phones.add(href.split(":", 1)[1])
            if "wa.me/" in low or "api.whatsapp.com" in low:
                whatsapp = href
            for platform in ("linkedin.com", "instagram.com", "facebook.com"):
                if platform in low and platform not in social:
                    social[platform.split(".")[0]] = href
    except Exception:
        pass

    if not emails or not whatsapp:
        for contact_url in discover_contact_links(page, url):
            contact = fetch_page(contact_url)
            if not contact:
                continue
            try:
                text = clean_text(contact.text)
                emails.update(EMAIL_RE.findall(text))
                for anchor in contact.css("a"):
                    href = anchor.attrib.get("href", "")
                    low = href.lower()
                    if low.startswith("mailto:"):
                        emails.add(href.split(":", 1)[1].split("?", 1)[0])
                    if "wa.me/" in low or "api.whatsapp.com" in low:
                        whatsapp = href
            except Exception:
                continue

    business_emails = []
    for email in emails:
        normalized = email.strip().lower().rstrip(".,;:)")
        host = normalized.split("@")[-1]
        if normalized and "@" in normalized and host not in BUSINESS_EMAIL_BLOCKLIST and domain(url).endswith(host):
            business_emails.append(normalized)
    business_emails = list(dict.fromkeys(business_emails))[:3]

    phone = next(iter(phones), None)
    score = 40
    if business_emails:
        score += 25
    if whatsapp:
        score += 25
    if social:
        score += 5
    if phone:
        score += 5

    return {
        "name": name,
        "website": url,
        "email": business_emails[0] if business_emails else None,
        "phone": clean_text(phone) if phone else None,
        "whatsapp": whatsapp,
        "linkedin": social.get("linkedin"),
        "instagram": social.get("instagram"),
        "facebook": social.get("facebook"),
        "location": requested_location,
        "score": min(score, 100),
    }


def discover(payload):
    queries = payload.get("queries") or []
    if isinstance(queries, str):
        queries = [queries]
    queries = [clean_text(q) for q in queries if clean_text(q)][:8]
    location = clean_text(payload.get("location"))
    limit = min(max(int(payload.get("limit", 20)), 1), MAX_RESULTS)
    candidates = []
    seen = set()
    for query in queries:
        for result in search_web(query):
            key = domain(result["url"])
            if key and key not in seen:
                seen.add(key)
                candidates.append(result)
            if len(candidates) >= limit * 2:
                break
        if len(candidates) >= limit * 2:
            break

    leads = []
    for candidate in candidates:
        lead = extract_lead(candidate, location)
        if lead:
            leads.append(lead)
        if len(leads) >= limit:
            break
        time.sleep(0.15)
    leads.sort(key=lambda item: (item["score"], bool(item["email"]), bool(item["whatsapp"])), reverse=True)
    return {"success": True, "count": len(leads), "leads": leads, "queries": queries}


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def auth_ok(self):
        if not API_KEY:
            return True
        return self.headers.get("X-API-Key", "") == API_KEY

    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"ok": True, "service": "nexor-scrapling-worker", "scrapling": True})
        return self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        if not self.auth_ok():
            return self.send_json(401, {"error": "unauthorized"})
        if self.path != "/v1/discover":
            return self.send_json(404, {"error": "not_found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            return self.send_json(200, discover(payload))
        except Exception as exc:
            print(f"scrapling-worker error: {exc}", file=sys.stderr)
            return self.send_json(500, {"success": False, "error": str(exc)})


if __name__ == "__main__":
    print(f"Nexor Scrapling worker listening on {HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
