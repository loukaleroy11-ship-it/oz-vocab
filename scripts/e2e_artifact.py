#!/usr/bin/env python3
"""
Test de la version « Artifact claude.ai » (fichier unique) avec une imitation
du runtime claude.ai (window.claude.use) : traduction par Claude (sample),
base de données synchronisée (db + user) et téléchargements (downloads).

Usage :
  npm run build:single
  python3 -m http.server 4174 --directory dist-single &
  python3 scripts/e2e_artifact.py http://localhost:4174 ./captures
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4174'
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'captures')
OUT.mkdir(parents=True, exist_ok=True)
results = []


def check(name, ok, detail=''):
    results.append((name, ok))
    print(('✔' if ok else '✘'), name, detail)


DOCS: dict[str, dict] = {}  # « serveur » partagé entre les deux appareils
WRITES = {'n': 0}


def db_op(source, op, payload):
    p = json.loads(payload)
    if op == 'get':
        body = DOCS.get(p['path'])
        return json.dumps({'exists': body is not None, 'body': body})
    if op == 'set':
        size = len(json.dumps(p['body']))
        if size > 256 * 1024:
            return json.dumps({'error': 'invalid_argument'})
        DOCS[p['path']] = p['body']
        WRITES['n'] += 1
        return json.dumps({'ok': True})
    if op == 'query':
        col = p['col']
        depth = len(col.split('/')) + 1
        out = []
        for path, body in DOCS.items():
            if not path.startswith(col + '/') or len(path.split('/')) != depth:
                continue
            ok = True
            for f, o, v in p['filters']:
                x = body.get(f)
                if o == '==' and x != v:
                    ok = False
                if o == '>' and not (x is not None and x > v):
                    ok = False
            if ok:
                out.append({'id': path.split('/')[-1], 'body': body})
        return json.dumps(out[: p.get('limit', 1000)])
    return json.dumps({'error': 'op'})


FAKE_RUNTIME = r"""
(() => {
  const call = async (op, payload) => JSON.parse(await window.fakeDbOp(op, JSON.stringify(payload)));
  const snap = (id, exists, body) => ({ id, exists, data: () => (exists ? JSON.parse(JSON.stringify(body)) : undefined), metadata: {} });
  function query(col, filters, limit) {
    return {
      where: (f, o, v) => query(col, [...filters, [f, o, v]], limit),
      orderBy: () => query(col, filters, limit),
      limit: (n) => query(col, filters, n),
      async get() {
        const rows = await call('query', { col, filters, limit });
        return { docs: rows.map((r) => snap(r.id, true, r.body)), size: rows.length, empty: !rows.length };
      },
    };
  }
  const doc = (path) => ({
    id: path.split('/').pop(), path,
    async get() { const r = await call('get', { path }); return snap(path.split('/').pop(), r.exists, r.body); },
    async set(body) { const r = await call('set', { path, body }); if (r.error) throw { code: r.error, message: r.error }; },
    async delete() {},
  });
  const db = { doc, collection: (path) => Object.assign(query(path, [], 1000), { path, doc: (id) => doc(path + '/' + id) }) };
  const sample = async (input) => ({ text: 'ok', truncated: false });
  sample.json = async (input) => {
    window.__prompts = (window.__prompts || []).concat([input]);
    await new Promise((r) => setTimeout(r, 300));
    if (input.includes('"courageux"')) {
      return { inputLanguage: 'fr', ambiguous: true, candidates: [
        { en: 'brave', fr: 'courageux', frAlt: ['vaillant'], pos: 'adjective', ipa: '/bɹæɪv/', exampleEn: 'You were really brave today.', exampleFr: 'Tu as été vraiment courageux aujourd’hui.', sense: 'courant' },
        { en: 'courageous', fr: 'courageux', frAlt: [], pos: 'adjective', ipa: '/kəˈɹæɪdʒəs/', exampleEn: 'It was a courageous decision.', exampleFr: 'C’était une décision courageuse.', sense: 'plus soutenu' },
      ] };
    }
    throw { code: 'refused', message: 'refused' };
  };
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  const caps = {
    sample,
    db,
    user: { id: async () => 'user-123', isOwner: () => true },
    downloads: { save: async (req) => { window.__downloads = (window.__downloads || []).concat([req]); return { status: 'saved' }; } },
  };
  window.claude = { use: (name) => new Promise((r) => setTimeout(() => r(caps[name] ?? null), 50)) };
})();
"""


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        errors = []

        def device(**kw):
            ctx = browser.new_context(locale='fr-FR', **kw)
            ctx.expose_binding('fakeDbOp', db_op)
            ctx.add_init_script(FAKE_RUNTIME)
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            return ctx, page

        # ---------- appareil 1 : iPhone
        ctx1, a = device(**p.devices['iPhone 13'])
        a.goto(BASE + '/index.html#accueil')
        expect(a.get_by_role('heading', name='Tableau de bord')).to_be_visible(timeout=15000)
        a.get_by_role('button', name='Commencer ma révision').click()
        for i in range(11):
            a.get_by_role('button', name='Révéler la réponse').click()
            a.get_by_role('button', name='Je ne connais pas' if i == 4 else 'Je connais').click()
        expect(a.get_by_text('Session terminée')).to_be_visible()
        a.goto(BASE + '/index.html#parametres')
        expect(a.get_by_text('Synchroniser mes appareils')).to_be_visible()
        a.get_by_role('button', name='Synchroniser maintenant').click()
        expect(a.get_by_text('Synchronisation terminée.')).to_be_visible(timeout=10000)
        check('synchronisation envoyée (appareil 1)', any('/w-' in k for k in DOCS) and any('/s-' in k for k in DOCS), f'{len(DOCS)} documents, {WRITES["n"]} écritures')
        check('espace privé de l’utilisateur', all(k.startswith('data/users/user-123/') for k in DOCS))
        check('pas de service worker dans claude.ai', a.evaluate('navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(r => r.length) : 0') == 0)

        # traduction par Claude
        a.goto(BASE + '/index.html#ajouter')
        expect(a.get_by_text('Claude (intégré à claude.ai)')).to_be_visible(timeout=10000)
        a.fill('#add-input', 'courageux')
        a.get_by_role('button', name='Rechercher').click()
        expect(a.get_by_text('Plusieurs traductions possibles')).to_be_visible(timeout=10000)
        a.screenshot(path=str(OUT / 'artifact-ajout-claude.png'), full_page=True)
        a.get_by_text('Choisir ce sens').first.click()
        check('fiche pré-remplie par Claude', a.input_value('#add-en') == 'brave' and a.input_value('#add-ipa') == '/bɹæɪv/')
        a.get_by_role('button', name='Ajouter à ma collection').click()
        expect(a.get_by_text('« brave » ajouté à ta collection.')).to_be_visible()
        prompts = a.evaluate('window.__prompts')
        check('la consigne demande l’IPA australienne', 'Cox & Palethorpe' in prompts[0] and 'courageux' in prompts[0])
        # refus du service : message honnête
        a.get_by_role('button', name='Ajouter un autre mot').click()
        a.fill('#add-input', 'xyzzq')
        a.get_by_role('button', name='Rechercher').click()
        expect(a.get_by_text('Cette demande a été refusée.')).to_be_visible(timeout=10000)
        check('échec de Claude signalé sans fausse traduction', a.locator('#add-fr').count() == 0)

        # export via la capacité « downloads »
        a.goto(BASE + '/index.html#parametres')
        a.get_by_role('button', name='Exporter la sauvegarde (JSON)').click()
        expect(a.get_by_text('Sauvegarde exportée.')).to_be_visible()
        dl = a.evaluate('window.__downloads')
        data = json.loads(dl[0]['data'])
        check('export via la capacité downloads', dl[0]['filename'].endswith('.json') and len(data['words']) == 501)
        a.get_by_role('button', name='Synchroniser maintenant').click()
        expect(a.get_by_text('Synchronisation terminée.').last).to_be_visible(timeout=10000)

        # ---------- appareil 2 : ordinateur, installé après
        ctx2, b = device(viewport={'width': 1280, 'height': 860})
        b.goto(BASE + '/index.html#accueil')
        expect(b.get_by_role('heading', name='Tableau de bord')).to_be_visible(timeout=15000)
        b.wait_for_timeout(2500)
        b.reload()
        expect(b.get_by_role('heading', name='Tableau de bord')).to_be_visible(timeout=15000)
        b.wait_for_timeout(1500)
        total = b.locator('dt:has-text("Dans la collection") + dd').inner_text().strip()
        new = b.locator('dt:has-text("Nouveaux") + dd').first.inner_text().strip()
        check('appareil 2 : progression et mot ajouté récupérés', total == '501' and new == '491', f'collection {total}, nouveaux {new}')
        b.goto(BASE + '/index.html#stats')
        b.wait_for_timeout(500)
        check('appareil 2 : historique de la session récupéré', b.get_by_text('Révision du jour').first.is_visible())
        b.screenshot(path=str(OUT / 'artifact-ordinateur-stats.png'), full_page=True)

        check('aucune erreur JavaScript', not errors, '; '.join(errors[:3]))
        browser.close()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} vérifications réussies')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    run()
