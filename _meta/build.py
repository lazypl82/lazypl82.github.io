"""Site metadata: one source of truth in _meta/pages.json.
Run from the repo root: python3 _meta/build.py
It rewrites the block between <!-- meta:start --> and <!-- meta:end --> in each page,
sets <title> and the description, and writes robots.txt and sitemap.xml.
sitemap lastmod is written only when a page sets "lastmod" in pages.json (update it when the content changes)."""
import json, re, html, datetime, subprocess, sys
cfg = json.load(open('_meta/pages.json'))
SITE = cfg['site']; IMG = SITE + cfg['default_image']; MP = cfg['marketplace']

def esc(s): return html.escape(s, quote=True)

def jsonld(kind, page):
    if kind == 'organization':
        d = {"@context": "https://schema.org", "@type": "Organization", "name": "Lazy Labs",
             "url": SITE + "/", "email": "runredteam@gmail.com",
             "brand": [{"@type": "Brand", "name": "Formbell"}, {"@type": "Brand", "name": "Pollfold"}]}
    elif kind == 'software':
        d = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Formbell",
             "alternateName": "Formbell: Conditional Email Notifications",
             "applicationCategory": "BusinessApplication", "operatingSystem": "Web (Google Forms add-on)",
             "url": SITE + page['path'], "installUrl": MP, "description": page['description'],
             "image": IMG,
             "offers": [{"@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD"},
                        {"@type": "Offer", "name": "Pro, monthly", "price": "4", "priceCurrency": "USD"},
                        {"@type": "Offer", "name": "Pro, yearly", "price": "29", "priceCurrency": "USD"}],
             "publisher": {"@type": "Organization", "name": "Lazy Labs", "url": SITE + "/"}}
    else:
        return ''
    return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>\n'

def lastmod(f):
    out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', f], capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()

urls = []
for p in cfg['pages']:
    f = p['file']; s = open(f, encoding='utf-8').read()
    if 'title' in p:
        s = re.sub(r'<title>.*?</title>', '<title>' + esc(p['title']) + '</title>', s, count=1, flags=re.S)
    title = html.unescape(re.search(r'<title>(.*?)</title>', s, re.S).group(1))
    if 'description' in p:
        desc = p['description']
    else:
        m = re.search(r'<meta name="description" content="([^"]*)">', s)
        if not m: sys.exit('no description for ' + f)
        desc = html.unescape(m.group(1))
    s = re.sub(r'\s*<meta name="description" content="[^"]*">', '', s)
    s = re.sub(r'\s*<!-- meta:start -->.*?<!-- meta:end -->', '', s, flags=re.S)
    url = SITE + p['path']
    block = ('<!-- meta:start -->\n'
             f'<meta name="description" content="{esc(desc)}">\n'
             f'<link rel="canonical" href="{url}">\n'
             f'<meta property="og:type" content="{p.get("type","website")}">\n'
             f'<meta property="og:site_name" content="{esc(p.get("site_name","Formbell by Lazy Labs"))}">\n'
             f'<meta property="og:title" content="{esc(title)}">\n'
             f'<meta property="og:description" content="{esc(desc)}">\n'
             f'<meta property="og:url" content="{url}">\n'
             f'<meta property="og:image" content="{IMG}">\n'
             '<meta name="twitter:card" content="summary_large_image">\n'
             + (jsonld(p.get('jsonld'), {**p, 'description': desc}) if p.get('jsonld') else '') +
             '<!-- meta:end -->')
    s = re.sub(r'(</title>)', r'\1\n' + block.replace('\\', '\\\\'), s, count=1)
    open(f, 'w', encoding='utf-8').write(s)
    urls.append((url, p.get('lastmod'), p.get('priority', '0.5')))

with open('robots.txt', 'w') as r:
    r.write('User-agent: *\n' + (''.join(f'Disallow: /{n}\n' for n in cfg['noindex']) or 'Allow: /\n') + f'\nSitemap: {SITE}/sitemap.xml\n')
with open('sitemap.xml', 'w') as m:
    m.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for u, d, pr in urls:
        m.write(f'  <url><loc>{u}</loc>' + (f'<lastmod>{d}</lastmod>' if d else '') + f'<priority>{pr}</priority></url>\n')
    m.write('</urlset>\n')
print('pages', len(urls))
