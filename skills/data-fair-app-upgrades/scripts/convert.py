"""Convert stored Data Fair application configurations to the shape of a newer version of their
base application, then validate each result against the target config-schema.json.

    python3 -I convert.py <app> <target> <input.json> <output.json> [--contours <dataset href>]

<app>     one of the converters below (repository or deployment name).
<target>  the target base application url (ending with "/", config-schema.json is appended),
          a config-schema.json url, or a local config-schema.json file.
<input>   {"<application id>": {"application": {...}, "configuration": {...}}, ...}
          or {"<application id>": <configuration>, ...}
<output>  [{"id", "title", "notes", "errors", "config"}, ...], one line printed per application.
          Applications that must not be upgraded (option removed without equivalent) are printed
          as SKIP and left out of the output.

Every transformation is described in ../references/breaking-changes.md. A result with errors, or
a note in capitals, needs a human look; "valid" is never enough, compare the renderings.
Network: reads the target schema and, for some apps, dataset schemas through their public href
(anonymous). Needs `jsonschema` (pip install jsonschema).
"""
import copy, json, math, os, sys, urllib.request, uuid
import jsonschema


def key(f):
    return f['key'] if isinstance(f, dict) else f


def fetch_json(url):
    with urllib.request.urlopen(url) as r:
        return json.load(r)


def bbox_to_view(c, notes, prop='bbox', size=800):
    """Replace a [west, south, east, north] bbox by center + zoom (Mercator fit in a size x size px map)."""
    bbox = c.pop(prop, None)
    if not bbox or 'center' in c:
        return
    # old forms stored it as a JSON string of strings
    w, s, e, n = (float(x) for x in (json.loads(bbox) if isinstance(bbox, str) else bbox))
    c['center'] = {'lon': round((w + e) / 2, 5), 'lat': round((s + n) / 2, 5)}
    y = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    z_lon = math.log2(size * 360 / 512 / max(e - w, 1e-6))
    z_lat = math.log2(size * 2 * math.pi / 512 / max(y(n) - y(s), 1e-6))
    c['zoom'] = round(max(0, min(22, z_lon, z_lat)), 1)
    notes.append('%s -> center/zoom %s' % (prop, c['zoom']))


# --- app-charts 1.1 / 1.2 -> 1.3+ (checked up to 1.4.13) -------------------------------------

def live_labels(href):
    """x-labels of the dataset as it is today ({} when unreadable: private or deleted dataset)."""
    try:
        return {f['key']: f.get('x-labels') for f in fetch_json(href + '/schema')}
    except Exception:
        return {}


def charts(cfg, notes, opts):
    if cfg.get('dynamicFilters'):
        notes.append('dynamic filters (%d): no equivalent since 1.2, do not upgrade' % len(cfg['dynamicFilters']))
        return None
    if 'chart' not in cfg:
        notes.append('no chart key: data-fair-charts 0.x, rebuild instead')
        return None
    c = copy.deepcopy(cfg)
    ds = []
    for d in c.get('datasets', []):
        if 'slug' in d: notes.append('datasets[].slug dropped')
        ds.append({k: v for k, v in d.items() if k in ('href', 'title', 'id', 'schema', 'finalizedAt')})
    c['datasets'] = ds
    if 'dynamicFilters' in c:
        del c['dynamicFilters']
    for f in c.get('staticFilters') or []:
        if isinstance(f.get('field'), dict):
            f['field'] = f['field']['key']; notes.append('staticFilters[].field -> key')
    if isinstance(c.get('divider'), (int, float)):
        n = c.pop('divider')
        if n not in (0, 1):
            c['multiplier'] = 1 / n; notes.append('divider %s -> multiplier %s' % (n, c['multiplier']))
        else:
            notes.append('divider 1 dropped')
    ch = c['chart']
    cc = ch.get('config') or {}
    # 1.1/1.2 stored field objects with their x-labels; 1.3+ reads labels from the live dataset
    # schema, which may have lost them: keep the stored ones as valueLabels
    fields = [(cc.get('groupBy') or {}).get('field')] + [cc.get(k) for k in ('groupsField', 'categoriesField', 'labelsField')]
    stored = {}
    if any(isinstance(f, dict) and f.get('x-labels') for f in fields):
        live = live_labels((cfg.get('datasets') or [{}])[0].get('href', ''))
        for f in fields:
            if isinstance(f, dict) and f.get('x-labels') and not live.get(f.get('key')):
                stored.update({str(v): l for v, l in f['x-labels'].items()})
    if 'categorizable' in ch:
        del ch['categorizable']; notes.append('chart.categorizable dropped')
    for k in ('labelsField', 'groupsField', 'categoriesField'):
        if isinstance(cc.get(k), dict):
            cc[k] = cc[k]['key']; notes.append('%s -> key' % k)
    for k in ('valuesFields', 'valuesCalc'):
        if any(isinstance(f, dict) for f in cc.get(k) or []):
            cc[k] = [key(f) for f in cc[k]]; notes.append('%s[] -> keys' % k)
    gb = cc.get('groupBy')
    if isinstance(gb, dict):
        if isinstance(gb.get('field'), dict):
            gb['field'] = gb['field']['key']; notes.append('groupBy.field -> key')
        if gb.get('type') == 'value':
            if gb.get('interval') not in (None, ''): notes.append('groupBy.interval %r -> ""' % gb['interval'])
            gb['interval'] = ''
    if isinstance(cc.get('valueCalc'), dict) and isinstance(cc['valueCalc'].get('field'), dict):
        cc['valueCalc']['field'] = cc['valueCalc']['field']['key']; notes.append('valueCalc.field -> key')
    if 'sortBy' in cc:
        sb = cc.pop('sortBy')
        target = 'rowSortBy' if cc.get('type', '').startswith('rows') else 'aggSortBy'
        cc[target] = sb; notes.append('sortBy -> ' + target)
    if 'colors' in cc:
        old = cc.pop('colors')
        if old.get('type') == 'palette':
            cc['colorOrder'] = {'type': 'palette', 'name': old.get('name', 'Accent'), 'offset': old.get('offset', 0)}
        else:
            co = {'type': 'manual', 'entries': [{'key': s['value'], 'color': s['color']} for s in old.get('styles', [])]}
            if old.get('defaultColor'): co['defaultColor'] = old['defaultColor']
            cc['colorOrder'] = co
        notes.append('colors(%s) -> colorOrder' % old.get('type'))
    if stored and not c.get('valueLabels'):
        c['valueLabels'] = [{'value': v, 'label': l} for v, l in stored.items()]
        notes.append('stored x-labels kept as valueLabels (%d)' % len(stored))
    # 1.1 started the y axis at 0 on its own, 1.3+ only when yAxisStartsZero is set
    if ch.get('yAxisStartsZero') is None and ch.get('type') in ('line', 'bar', 'multi-line', 'multi-bar', 'paired-histogram'):
        notes.append('check the y axis: set chart.yAxisStartsZero if the original started at 0')
    return c


# --- periodic-series 0.2 -> 1.0 ---------------------------------------------------------------

# order of the 0.2 store (dateField getter)
DATE_CONCEPTS = ['http://schema.org/Date', 'https://schema.org/endDate', 'https://schema.org/startDate']


def periodic_series(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    schema = (c.get('datasets') or [{}])[0].get('schema') or []
    c['datasets'] = [{k: d[k] for k in ('href', 'title', 'id') if k in d} for d in c.get('datasets') or []]
    if not c.get('dateField'):
        found = next((f['key'] for concept in DATE_CONCEPTS for f in schema if f.get('x-refersTo') == concept), None)
        if found:
            c['dateField'] = found; notes.append('dateField = %s (0.2 concept rule)' % found)
        else:
            notes.append('NO DATE COLUMN FOUND')
    chart = c.get('chart') or {}
    if 'period' in chart:
        c.setdefault('period', chart.pop('period')); notes.append('chart.period -> period')
    m = c.get('metric') or {}
    if 'valueField' in m:
        m['field'] = key(m.pop('valueField')); notes.append('metric.valueField -> metric.field key')
    if isinstance(c.get('categoryField'), dict):
        c['categoryField'] = c['categoryField']['key']; notes.append('categoryField -> key')
    if 'filters' in c:
        static = []
        for f in c.pop('filters') or []:
            nf = {k: v for k, v in f.items() if k != 'field'}
            fld = f.get('field')
            nf['field'] = {k: fld[k] for k in ('key', 'label') if k in fld} if isinstance(fld, dict) else {'key': fld}
            static.append(nf)
        c['staticFilters'] = (c.get('staticFilters') or []) + static
        notes.append('filters -> staticFilters (%d)' % len(static))
    return c


# --- app-treemap 0.3 / 1.0 -> 1.3 -------------------------------------------------------------

def treemap(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    if any(isinstance(a, dict) for a in c.get('aggs') or []):
        c['aggs'] = [key(a) for a in c['aggs']]; notes.append('aggs[] -> keys')
    # seeded "hash" colours were removed in 1.0: closest is a palette computed on the first level
    if (c.get('color') or {}).get('type') == 'hash' and c.get('aggs'):
        c['color'] = {'type': 'computed', 'colorField': c['aggs'][0], 'colors': {'type': 'computed', 'name': 'Set2'}}
        notes.append('color hash -> computed palette on %s (colours change)' % c['aggs'][0])
    return c


# --- metrics 1.5 -> 1.6 -----------------------------------------------------------------------

# Vuetify typography classes -> Material 3 type scale, matched by their form labels
SIZES = {'h1': 'display-small', 'h2': 'display-small', 'h3': 'headline-medium', 'h4': 'headline-small', 'h5': 'title-large', 'h6': 'body-large'}


def metrics(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    for m in c.get('metrics') or []:
        for part in ('label', 'value'):
            p = m.get(part)
            if isinstance(p, dict) and p.get('size') in SIZES:
                notes.append('%s.size %s -> %s' % (part, p['size'], SIZES[p['size']])); p['size'] = SIZES[p['size']]
    return c


# --- infos-parcelles 2.8 -> 2.10 --------------------------------------------------------------

def parcels(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    if c.get('heightField') or c.get('baseField'):
        notes.append('3D view (heightField/baseField): removed in 2.8, do not upgrade')
        return None
    # 2.10 reads the parcel id column from datasets[0].schema
    for d in c.get('datasets') or []:
        if 'schema' not in d and d.get('href'):
            d['schema'] = fetch_json(d['href'] + '/schema'); notes.append('datasets[].schema stored')
    bbox_to_view(c, notes, 'initialBounds')
    return c


# --- admin-divs-catchment 0.1 -> 1.0 ----------------------------------------------------------

def catchment(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    # 1.0 draws contours from a Data Fair dataset served as vector tiles
    if not c.get('contoursDataset'):
        if opts.get('contours'):
            d = fetch_json(opts['contours'] + '?select=id,title,href,schema,bbox')
            c['contoursDataset'] = {k: d[k] for k in ('href', 'title', 'id', 'schema', 'bbox') if k in d}
            notes.append('contoursDataset = %s' % d['title'])
        else:
            notes.append('NO contoursDataset: pass --contours <href of a contours dataset with the concept of codeField>')
    bbox_to_view(c, notes)
    if 'center' not in c:
        notes.append('NO center/zoom: 1.0 fits all contours (overseas included), set a view')
    return c


# --- infos-territoires 1.1 -> 1.2 -------------------------------------------------------------

def choropleth(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    for ind in c.get('indicators') or []:
        d = ind.get('divider')
        if d in (None, 1):
            if d == 1: notes.append('divider 1 -> none')
            ind['divider'] = {'type': 'none'}
        elif not isinstance(d, dict):
            notes.append('DIVIDER %r: no constant divider in 1.2, check by hand' % d)
    # 1.2 ignores bbox and fits the shapes
    bbox_to_view(c, notes)
    return c


# --- atelier-carto <= 1.7 -> 1.8 --------------------------------------------------------------

def multilayer(cfg, notes, opts):
    c = copy.deepcopy(cfg)
    keep = lambda d, ks: {k: d[k] for k in ks if k in d}
    # dataset references refuse additional properties (slug, finalizedAt... added on read)
    c['datasets'] = [keep(d, ('href', 'title', 'id', 'schema', 'bbox', 'attachmentsAsImage')) for d in c.get('datasets') or []]
    for l in c.get('layers') or []:
        if isinstance(l.get('dataset'), dict): l['dataset'] = keep(l['dataset'], ('href', 'title', 'id'))
        if isinstance(l.get('opacity'), (int, float)) and l['opacity'] <= 10:
            l['opacity'] = int(l['opacity'] * 10); notes.append('opacity x10 (scale 1-10 -> 0-100)')
        if not l.get('uuid'):
            l['uuid'] = str(uuid.uuid4()); notes.append('uuid added')
        for s in [l.get('shapes')] if isinstance(l.get('shapes'), dict) else l.get('shapes') or []:
            if isinstance(s, dict) and s.get('type') == 'label':
                if 'radius' in s: s['cornerRadius'] = s.pop('radius'); notes.append('label radius -> cornerRadius')
                if 'scale' in s: s['textSize'] = s.pop('scale'); notes.append('label scale -> textSize')
        if (l.get('colors') or {}).get('type') == 'enum' and not (l['colors'].get('enumOptions') or {}).get('valuesColor'):
            notes.append('ENUM COLORS WITHOUT valuesColor: give every value a colour (default marker never generated)')
    if 'selectionColor' not in c:
        c['selectionColor'] = '#AA2222'; notes.append('selectionColor set (without it 1.8 renders no layer)')
    bbox_to_view(c, notes)
    if c.get('useDataBbox'):
        notes.append('useDataBbox true: now honoured, check the initial view')
    return c


CONVERTERS = {
    'app-charts': charts, 'periodic-series': periodic_series, 'app-treemap': treemap, 'metrics': metrics,
    'infos-parcelles': parcels, 'admin-divs-catchment': catchment, 'infos-territoires': choropleth, 'atelier-carto': multilayer,
}
ALIASES = {
    'charts': 'app-charts', 'app-periodic-series': 'periodic-series', 'treemap': 'app-treemap', 'app-indicators': 'metrics',
    'app-parcels-map': 'infos-parcelles', 'app-catchment-map': 'admin-divs-catchment', 'app-choropleth-map': 'infos-territoires',
    'app-multilayer-map': 'atelier-carto',
}


def load_schema(target):
    if os.path.exists(target):
        return json.load(open(target))
    return fetch_json(target + 'config-schema.json' if target.endswith('/') else target)


def main(argv):
    opts = {}
    if '--contours' in argv:
        i = argv.index('--contours'); opts['contours'] = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    if len(argv) != 4 or ALIASES.get(argv[0], argv[0]) not in CONVERTERS:
        sys.exit(__doc__ + '\nconverters: ' + ', '.join(CONVERTERS))
    app, target, in_file, out_file = argv
    convert = CONVERTERS[ALIASES.get(app, app)]
    schema = load_schema(target)
    V = jsonschema.validators.validator_for(schema, default=jsonschema.Draft7Validator)(schema)
    out = []
    for app_id, item in json.load(open(in_file)).items():
        cfg = item['configuration'] if 'configuration' in item else item
        title = (item.get('application') or {}).get('title', '') if 'configuration' in item else ''
        notes = []
        new = convert(cfg, notes, opts)
        if new is None:
            print('SKIP', app_id[:28].ljust(28), title[:40].ljust(40), '; '.join(notes))
            continue
        errs = sorted(V.iter_errors(new), key=lambda e: list(e.absolute_path))
        errs = [e for e in errs if e.validator != 'oneOf'] or errs  # keep the most specific ones
        errors = [{'path': '/'.join(map(str, e.absolute_path)), 'msg': e.message[:200]} for e in errs[:6]]
        out.append({'id': app_id, 'title': title, 'notes': notes, 'errors': errors, 'config': new})
        print('ERR' if errors else 'ok ', app_id[:28].ljust(28), title[:40].ljust(40), '; '.join(dict.fromkeys(notes)))
        for e in errors: print('     ', e['path'], e['msg'][:160])
    os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)
    json.dump(out, open(out_file, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
