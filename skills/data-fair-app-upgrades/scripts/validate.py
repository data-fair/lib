"""Validate stored application configurations against a config-schema.json, unchanged.

    python3 -I validate.py <config-schema.json file or url> <input.json> [id ...]

<input> is {"<id>": {"configuration": {...}}, ...}, {"<id>": <configuration>, ...} or the
[{"id", "config"}, ...] output of convert.py. Prints the errors of each configuration and a
summary by top-level key and keyword. Test it on a configuration you know is broken first:
some schemas accept almost anything. Needs `jsonschema` (pip install jsonschema).
"""
import collections, json, os, sys, urllib.request
import jsonschema

if len(sys.argv) < 3:
    sys.exit(__doc__)
src = sys.argv[1]
if os.path.exists(src):
    schema = json.load(open(src))
else:
    with urllib.request.urlopen(src) as r:
        schema = json.load(r)
data = json.load(open(sys.argv[2]))
if isinstance(data, list):
    data = {c['id']: c['config'] for c in data}
ids = sys.argv[3:] or list(data)
v = jsonschema.validators.validator_for(schema, default=jsonschema.Draft7Validator)(schema)
summary = collections.Counter()
for i in ids:
    conf = data[i]['configuration'] if 'configuration' in data[i] else data[i]
    errs = sorted(v.iter_errors(conf), key=lambda e: list(e.absolute_path))
    print(f'== {i[:40]}: {len(errs)} error(s)')
    for e in errs[:15]:
        p = '/' + '/'.join(str(x) for x in e.absolute_path)
        summary[(p.split('/')[1] if p != '/' else '/', e.validator)] += 1
        print(f'   {p} [{e.validator}] {e.message[:160]}')
print('\nsummary:', summary.most_common())
