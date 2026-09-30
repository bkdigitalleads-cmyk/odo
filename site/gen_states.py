#!/usr/bin/env python3
"""Build the per-state permit driving hours pages from src/states.ts.

Run from the repo root:  python3 site/gen_states.py
Writes states/<slug>.html, states/index.html, sitemap.xml and robots.txt.
The numbers come only from src/states.ts (verified against IIHS and state
DMV sources, see docs/state-sources.md). Nothing here invents a figure.
"""
import html
import json
import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://bkdigitalleads-cmyk.github.io/odo"
APP_URL = "https://apps.apple.com/us/app/id6804463602"
APP_NAME = "Driving Hours Log: Teen Permit"
CHECKED = "August 24, 2026"
IIHS = "https://www.iihs.org/topics/teenagers/graduated-licensing-laws-table"
OFFICIAL = {
    "WI": ("Wisconsin DMV form HS-303", "https://wisconsindot.gov/Documents/dmv/shared/hs303.pdf"),
    "VT": ("Vermont DMV supervised driving log", "https://dmv.vermont.gov/"),
    "VA": ("Virginia DMV driver education requirements", "https://www.dmv.virginia.gov/"),
    "WA": ("Washington statute RCW 46.20.075", "https://app.leg.wa.gov/rcw/default.aspx?cite=46.20.075"),
    "WV": ("West Virginia DMV graduated licensing page", "https://dmv.wv.gov/"),
}


def load_states():
    src = open(os.path.join(ROOT, "src", "states.ts")).read()
    rows = []
    for m in re.finditer(r"\{\s*code:\s*'(\w+)',\s*name:\s*'([^']+)',\s*totalHours:\s*(\d+|null),\s*nightHours:\s*(\d+)(?:,\s*note:\s*'([^']*)')?\s*\}", src):
        code, name, total, night, note = m.groups()
        rows.append({
            "code": code,
            "name": name,
            "total": None if total == "null" else int(total),
            "night": int(night),
            "note": (note or "").replace(" — ", ": ").replace("—", ":"),
        })
    return rows


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def esc(s):
    return html.escape(s, quote=True)


CSS = """
body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;color:#EDEDED;background:#141414;line-height:1.65}
.wrap{max-width:720px;margin:0 auto;padding:40px 22px 56px}
h1{font-size:30px;line-height:1.25;color:#fff;margin:10px 0 8px}
h2{color:#F5B301;font-size:21px;margin-top:36px}
a{color:#F5B301}
.badge{color:#F5B301;font-weight:600;letter-spacing:.4px;font-size:13px;text-transform:uppercase}
.answer{background:#1e1e1e;border:1px solid #2a2a2a;border-radius:14px;padding:18px 20px;margin:22px 0}
.answer .big{font-size:40px;font-weight:700;color:#fff;line-height:1.1}
.answer .sub{color:#B9B4A9;margin-top:6px}
.cta{display:inline-block;background:#F5B301;color:#141414;font-weight:700;padding:13px 24px;border-radius:12px;text-decoration:none;font-size:16px;margin-top:8px}
.cta:hover{background:#ffc72e}
table{width:100%;border-collapse:collapse;margin:18px 0;font-size:15px}
th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #2a2a2a;vertical-align:top}
th{color:#B9B4A9;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.3px}
.muted{color:#8f8a80;font-size:14px}
.grid{columns:2;column-gap:28px;font-size:15px}
.grid a{display:block;padding:3px 0}
footer{margin-top:44px;padding-top:18px;border-top:1px solid #2a2a2a;color:#8f8a80;font-size:14px}
.crumbs{font-size:14px;color:#8f8a80}
.faq p{margin:6px 0 16px}
.faq b{color:#fff}
"""


def page_shell(title, desc, canonical, body, ld=None):
    ld_tags = "".join('<script type="application/ld+json">%s</script>' % json.dumps(x, ensure_ascii=False) for x in (ld or []))
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
{ld_tags}
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
{body}
<footer>
<p><a href="{BASE}/">{esc(APP_NAME)}</a> · <a href="{BASE}/states/">All states</a> · <a href="{BASE}/privacy.html">Privacy</a> · <a href="{BASE}/support.html">Support</a></p>
<p>Requirements change. Figures on this page were checked against the IIHS graduated licensing table and state DMV sources on {CHECKED}. Confirm the current rule with your state's DMV before your road test.</p>
</footer>
</div>
</body>
</html>
"""


def hours_phrase(s):
    if s["total"] is None:
        return "no statewide minimum"
    if s["night"]:
        return f"{s['total']} hours, {s['night']} of them at night"
    return f"{s['total']} hours, no set night minimum"


def state_page(s, all_states):
    name = s["name"]
    url = f"{BASE}/states/{slug(name)}.html"
    if s["total"] is None:
        title = f"{name} Permit Driving Hours: No Statewide Minimum (2026)"
        desc = f"{name} sets no statewide number of supervised practice hours for learner permit holders. What that means, what to log anyway, and how to keep a signed driving log."
        big = "No minimum"
        sub = f"{name} does not set a statewide supervised practice hour requirement."
        answer = (f"{name} is one of the few states with no statewide minimum number of supervised driving hours before the road test. "
                  f"That does not mean practice is optional: the road test still has to be passed, insurers and driving schools often ask for a record, and most states that do set a number land between 40 and 60 hours. "
                  f"A sensible goal for a new driver in {name} is 50 hours, with 10 of them after dark.")
    else:
        night_txt = f", including {s['night']} at night" if s["night"] else ""
        title = f"{name} Permit Driving Hours Requirement (2026): {s['total']} Hours{night_txt}"
        desc = f"{name} requires {s['total']} hours of supervised driving practice{night_txt} before a teen with a learner permit can take the road test. How to log and prove the hours."
        big = f"{s['total']} hours"
        sub = (f"{s['night']} of them at night" if s["night"] else "No separate night hour minimum") + f", before the {name} road test"
        answer = (f"A learner permit holder under 18 in {name} must complete {s['total']} hours of supervised driving practice"
                  + (f", and at least {s['night']} of those hours must be at night" if s["night"] else "")
                  + f", before taking the road test. The supervising driver is normally a parent, guardian or another licensed adult who meets {name}'s age and licensing rules.")
    note = s["note"]
    note_html = f"<p><b>Worth knowing:</b> {esc(note)}</p>" if note else ""

    official = OFFICIAL.get(s["code"])
    src_html = f'<li><a href="{IIHS}" rel="nofollow">IIHS graduated driver licensing laws table</a>, checked {CHECKED}</li>'
    if official:
        src_html += f'<li><a href="{esc(official[1])}" rel="nofollow">{esc(official[0])}</a></li>'

    faq = [
        (f"How many supervised driving hours does {name} require?",
         answer),
        ("What counts as a supervised practice hour?",
         f"Time behind the wheel with a qualifying supervising adult in the passenger seat. Lessons with a driving school count in most states, and many states let approved driver education reduce or replace part of the requirement. Sitting in traffic counts; sitting in a parked car does not. Log the real minutes and let the total add up."),
        (f"Do I have to show the {name} DMV a log?",
         f"Many DMV offices ask for a signed record of practice hours when you schedule or take the road test, and some have their own form. Keep a log with the date, start and end time, day or night, weather and the supervisor's name for every drive, then have the supervising driver sign it. If {name} uses its own form, copy the totals across from your log."),
        ("What is the easiest way to keep the log?",
         f"{APP_NAME} for iPhone keeps a two-tap log of every drive, tracks total and night hours against the {name} requirement, and exports a signed PDF for the DMV. It works offline and needs no account."),
    ]
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    crumbs_ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": APP_NAME, "item": BASE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Driving hours by state", "item": BASE + "/states/"},
        {"@type": "ListItem", "position": 3, "name": name, "item": url}]}

    others = "".join(f'<a href="{slug(o["name"])}.html">{esc(o["name"])}: {esc(hours_phrase(o))}</a>' for o in all_states if o["code"] != s["code"])

    body = f"""
<p class="crumbs"><a href="{BASE}/">{esc(APP_NAME)}</a> › <a href="{BASE}/states/">Driving hours by state</a> › {esc(name)}</p>
<p class="badge">Learner permit, under 18</p>
<h1>How many supervised driving hours do you need in {esc(name)}?</h1>
<div class="answer">
<div class="big">{esc(big)}</div>
<div class="sub">{esc(sub)}</div>
</div>
<p>{esc(answer)}</p>
{note_html}

<h2>What to write down for every drive</h2>
<p>The DMV cares about totals, but the totals are only as good as the log behind them. For each practice drive record the date, the start and end time, whether it was day or night, the weather or road conditions, and who supervised. Most families lose track of the night hours first, so keep those as their own running total.</p>
<p><a class="cta" href="{APP_URL}">Track {esc(name)} hours in the app</a></p>
<p class="muted">{esc(APP_NAME)} has the {esc(name)} requirement built in, logs a drive in two taps, and exports a signed PDF log. Free for the first 10 drives.</p>

<h2>Frequently asked questions</h2>
<div class="faq">
{"".join(f"<p><b>{esc(q)}</b><br>{esc(a)}</p>" for q, a in faq)}
</div>

<h2>Sources</h2>
<ul>{src_html}</ul>
<p class="muted">Laws change. Always confirm the current requirement with the {esc(name)} DMV before you book the road test.</p>

<h2>Other states</h2>
<div class="grid">{others}</div>
"""
    return url, page_shell(title, desc, url, body, [faq_ld, crumbs_ld])


def index_page(states):
    url = f"{BASE}/states/"
    title = "Supervised Driving Hours Required by State (2026): Permit Practice Hours for All 50 States"
    desc = "How many supervised driving hours each US state requires before a teen with a learner permit can take the road test, including night hours. All 50 states and DC."
    rows = "".join(
        f'<tr><td><a href="{slug(s["name"])}.html">{esc(s["name"])}</a></td><td>{"None set" if s["total"] is None else s["total"]}</td><td>{s["night"] if s["night"] else ("n/a" if s["total"] is None else "None set")}</td><td class="muted">{esc(s["note"])}</td></tr>'
        for s in states)
    body = f"""
<p class="crumbs"><a href="{BASE}/">{esc(APP_NAME)}</a> › Driving hours by state</p>
<p class="badge">Learner permit, under 18</p>
<h1>Supervised driving hours required by state</h1>
<p>Most states require between 40 and 60 hours of supervised practice before a learner permit holder can take the road test, and most want 10 or more of those hours at night. Two states set no number at all, and a few let an approved driver education course replace part of the requirement. Tap a state for the details and what to log.</p>
<table>
<tr><th>State</th><th>Total hours</th><th>Night hours</th><th>Notes</th></tr>
{rows}
</table>
<p class="muted">Checked against the IIHS graduated licensing table and state DMV sources on {CHECKED}. Confirm with your state's DMV.</p>
<p><a class="cta" href="{APP_URL}">Log your hours with {esc(APP_NAME)}</a></p>
"""
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": "Supervised driving hours by state",
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": s["name"], "url": f"{BASE}/states/{slug(s['name'])}.html"} for i, s in enumerate(states)]}
    return url, page_shell(title, desc, url, body, [ld])


def main():
    states = sorted(load_states(), key=lambda s: s["name"])
    assert len(states) == 51, len(states)
    out_dir = os.path.join(ROOT, "states")
    os.makedirs(out_dir, exist_ok=True)
    urls = [f"{BASE}/", f"{BASE}/support.html", f"{BASE}/privacy.html"]
    url, html_ = index_page(states)
    open(os.path.join(out_dir, "index.html"), "w").write(html_)
    urls.append(url)
    for s in states:
        url, html_ = state_page(s, states)
        open(os.path.join(out_dir, slug(s["name"]) + ".html"), "w").write(html_)
        urls.append(url)
    today = date.today().isoformat()
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls) + "</urlset>\n"
    open(os.path.join(ROOT, "sitemap.xml"), "w").write(sm)
    open(os.path.join(ROOT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n")
    print(f"wrote {len(states)} state pages, index, sitemap ({len(urls)} urls)")


if __name__ == "__main__":
    main()
