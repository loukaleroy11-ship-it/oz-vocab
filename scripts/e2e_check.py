#!/usr/bin/env python3
"""
Parcours de bout en bout dans un vrai navigateur (Chromium, Playwright).

Usage :
  npm run build && npx vite preview --port 4173
  python3 scripts/e2e_check.py http://localhost:4173 ./captures

Vérifie : 500 mots au premier lancement, session de 10 mots avec retour en fin
de liste, reprise après rechargement, filtres et recherche, ajout manuel d'un
mot (avec et sans service de traduction), export / import, affichage mobile
sans défilement horizontal, comportement hors ligne.
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'captures')
OUT.mkdir(parents=True, exist_ok=True)
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = ''):
    results.append((name, ok, detail))
    print(('✔' if ok else '✘'), name, detail)


def no_horizontal_scroll(page) -> bool:
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        iphone = p.devices['iPhone 13']
        ctx = browser.new_context(**iphone, locale='fr-FR', timezone_id='Australia/Perth', accept_downloads=True)
        page = ctx.new_page()
        errors: list[str] = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)

        # ---------- 1. premier lancement
        page.goto(BASE + '/#accueil')
        expect(page.get_by_role('heading', name='Tableau de bord')).to_be_visible(timeout=15000)
        total = page.locator('dt:has-text("Dans la collection") + dd').inner_text()
        check('500 mots présents au premier lancement', total.strip() == '500', f'collection = {total}')
        check('mobile : pas de défilement horizontal (accueil)', no_horizontal_scroll(page))
        page.screenshot(path=str(OUT / 'mobile-accueil.png'), full_page=True)

        # ---------- 2. première liste (thèmes cohérents), retour en fin de liste
        page.get_by_role('button', name='Commencer ma révision').click()
        expect(page.get_by_role('button', name='Révéler la réponse')).to_be_visible()
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT / 'mobile-carte.png'))
        seen = []
        for i in range(11):
            word = page.locator('article h2').inner_text()
            seen.append(word)
            page.get_by_role('button', name='Révéler la réponse').click()
            if i == 0:
                page.wait_for_timeout(350)
                page.screenshot(path=str(OUT / 'mobile-carte-revelee.png'))
            # 3e mot (« do ») inconnu, les autres connus
            name = 'Je ne connais pas' if i == 2 else 'Je connais'
            page.get_by_role('button', name=name).click()
        check('première liste cohérente : verbes essentiels puis pronoms', seen == ['be', 'have', 'do', 'get', 'you', 'it', 'they', 'we', 'he', 'I', 'she'], ', '.join(seen))
        word12 = page.locator('article h2').inner_text()
        check('mot inconnu revenu en fin de liste', word12 == 'do', f'12e carte = {word12}')
        badge = page.get_by_text('Revient · 2e passage')
        check('indication de répétition affichée', badge.is_visible())
        counter = page.locator('p[aria-live="polite"]').first.inner_text()
        check('compteur mots distincts / répétitions', '11' in counter and 'répétition' not in counter, counter)

        # ---------- 3. interruption puis reprise après rechargement
        page.reload()
        expect(page.get_by_role('button', name='Révéler la réponse')).to_be_visible(timeout=10000)
        check('session reprise après rechargement', page.locator('article h2').inner_text() == 'do')
        page.get_by_role('button', name='Révéler la réponse').click()
        page.get_by_role('button', name='Je connais').click()
        expect(page.get_by_text('Session terminée')).to_be_visible()
        page.screenshot(path=str(OUT / 'mobile-bilan.png'), full_page=True)
        summary = page.locator('main').inner_text().lower()
        import re
        check('bilan : 11 mots distincts, 1 répétition', bool(re.search(r'mots distincts\s+11\b', summary)) and bool(re.search(r'répétitions\s+1\b', summary)))
        nxt = page.get_by_role('button', name='Liste suivante')
        check('après la liste : nouvelle liste proposée', nxt.is_visible(), nxt.inner_text() if nxt.count() else '')
        page.get_by_role('button', name='Tableau de bord').click()
        page.goto(BASE + '/#reviser')
        expect(page.get_by_role('heading', name='Nouvelle liste')).to_be_visible()
        chips = page.get_by_label('Thèmes de la liste').inner_text()
        check('liste suivante : déterminants et prépositions', 'déterminants' in chips and 'prépositions' in chips, chips.replace('\n', ', '))
        page.screenshot(path=str(OUT / 'mobile-liste-suivante.png'), full_page=True)

        # ---------- 4. sauvegarde après rechargement + statistiques
        page.goto(BASE + '/#accueil')
        page.reload()
        expect(page.get_by_role('heading', name='Tableau de bord')).to_be_visible()
        new_count = page.locator('dt:has-text("Nouveaux") + dd').first.inner_text()
        check('progrès conservés après rechargement', new_count.strip() == '489', f'nouveaux = {new_count}')
        txt = page.locator('main').inner_text()
        check('statistiques du jour', 'Révisés aujourd’hui : 11 mots' in txt and '11 bonnes réponses sur 12' in txt)
        check('accueil : prochaine liste annoncée', 'prochaine liste' in txt.lower() and 'nouveaux mots' in txt)

        # ---------- 5. explorer : filtres combinés et recherche
        page.goto(BASE + '/#explorer')
        page.get_by_role('button', name='Filtres').click()
        page.get_by_role('button', name='Top 100').click()
        page.get_by_role('button', name='Verbes', exact=True).click()
        count_txt = page.locator('p[aria-live="polite"]').inner_text()
        check('filtre Top 100 + Verbes', 'Top 100 · verbes' in count_txt, count_txt)
        page.get_by_role('button', name='Nouveaux mots').click()
        check('filtres combinés avec l’état', 'nouveau' in page.locator('p[aria-live="polite"]').inner_text())
        page.screenshot(path=str(OUT / 'mobile-explorer.png'), full_page=True)
        page.get_by_role('button', name='Effacer les filtres').click()
        page.fill('#explore-search', 'maison')
        page.wait_for_timeout(300)
        rows = page.locator('main ul li').all_inner_texts()
        check('recherche en français (maison)', any('house' in r for r in rows) and any('home' in r for r in rows))
        page.fill('#explore-search', 'scho')
        page.wait_for_timeout(300)
        check('recherche partielle en anglais', any('school' in r for r in page.locator('main ul li').all_inner_texts()))
        check('mobile : pas de défilement horizontal (explorer)', no_horizontal_scroll(page))
        page.fill('#explore-search', 'because')
        page.wait_for_timeout(300)
        page.locator('main ul li button.text-left').first.click()
        expect(page.get_by_role('dialog')).to_be_visible()
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT / 'mobile-fiche.png'))
        page.keyboard.press('Escape')

        # ---------- 6. ajouter un mot : service gratuit injoignable
        page.route('**/api.mymemory.translated.net/**', lambda r: r.abort())
        page.route('**/api.dictionaryapi.dev/**', lambda r: r.abort())
        page.goto(BASE + '/#ajouter')
        expect(page.get_by_text('Traduction gratuite (MyMemory + Wiktionary)')).to_be_visible(timeout=15000)
        page.fill('#add-input', 'courageux')
        page.get_by_role('button', name='Rechercher').click()
        expect(page.get_by_text('Remplir à la main').last).to_be_visible(timeout=20000)
        check('service injoignable signalé honnêtement', page.get_by_text('ne répond pas').first.is_visible())
        page.get_by_role('button', name='Remplir à la main').last.click()
        check('saisie FR détectée et pré-remplie', page.input_value('#add-fr') == 'courageux')
        page.fill('#add-en', 'brave')
        page.select_option('#add-pos', 'adjective')
        page.fill('#add-exen', 'She was very brave.')
        page.fill('#add-exfr', 'Elle a été très courageuse.')
        page.screenshot(path=str(OUT / 'mobile-ajout.png'), full_page=True)
        page.get_by_role('button', name='Ajouter à ma collection').click()
        expect(page.get_by_text('« brave » ajouté à ta collection.')).to_be_visible()
        # doublon
        page.get_by_role('button', name='Ajouter un autre mot').click()
        page.fill('#add-input', 'house')
        page.get_by_role('button', name='Rechercher').click()
        expect(page.get_by_text('Déjà dans ta collection')).to_be_visible(timeout=15000)
        check('doublon détecté (house)', True)

        # ---------- 6 bis. service gratuit (réponses réelles enregistrées)
        fixtures = Path(__file__).resolve().parent.parent / 'tests' / 'fixtures'
        def free_api(route):
            u = route.request.url
            from urllib.parse import unquote
            u = unquote(u)
            if 'mymemory' in u:
                if 'q=courageux' in u:
                    return route.fulfill(body=(fixtures / 'mm_courageux_fren.json').read_text(), content_type='application/json')
                return route.fulfill(json={'responseData': {'translatedText': 'Elle était très courageuse.', 'match': 0.9}})
            for w in ['brave', 'courageous']:
                if u.endswith('/' + w):
                    return route.fulfill(body=(fixtures / f'dict_{w}.json').read_text(), content_type='application/json')
            return route.fulfill(status=404, body='[]')
        ctxf = browser.new_context(**iphone, locale='fr-FR')
        pf = ctxf.new_page()
        pf.route('**/api.mymemory.translated.net/**', free_api)
        pf.route('**/api.dictionaryapi.dev/**', free_api)
        pf.goto(BASE + '/#ajouter')
        pf.fill('#add-input', 'courageux')
        pf.get_by_role('button', name='Rechercher').click()
        expect(pf.get_by_text('Plusieurs traductions possibles')).to_be_visible(timeout=20000)
        pf.wait_for_timeout(300)
        pf.screenshot(path=str(OUT / 'mobile-ajout-gratuit.png'), full_page=True)
        pf.get_by_text('Choisir ce sens').first.click()
        check('service gratuit : fiche pré-remplie (brave, adjectif, IPA)', pf.input_value('#add-en') == 'brave' and pf.input_value('#add-pos') == 'adjective' and pf.input_value('#add-ipa') == '/bɹeɪv/')
        ctxf.close()

        # ---------- 7. ajout avec un service de traduction simulé (réponse ambiguë)
        def fake_api(route):
            if route.request.method == 'GET':
                route.fulfill(json={'ok': True, 'configured': True})
            else:
                body = json.loads(route.request.post_data or '{}')
                route.fulfill(json={
                    'inputLanguage': 'en', 'ambiguous': True,
                    'candidates': [
                        {'en': 'to improve', 'fr': 'améliorer', 'frAlt': ['perfectionner'], 'pos': 'verb', 'ipa': '/ɪmˈpɹʉːv/', 'exampleEn': 'I want to improve my English.', 'exampleFr': 'Je veux améliorer mon anglais.', 'sense': 'rendre meilleur'},
                        {'en': 'to improve', 'fr': 's’améliorer', 'frAlt': [], 'pos': 'verb', 'ipa': '/ɪmˈpɹʉːv/', 'exampleEn': 'The weather should improve.', 'exampleFr': 'Le temps devrait s’améliorer.', 'sense': 'devenir meilleur'},
                    ],
                    'echo': body.get('text'),
                })
        ctx2 = browser.new_context(**iphone, locale='fr-FR')
        p2 = ctx2.new_page()
        p2.route('**/api/lookup', fake_api)
        p2.goto(BASE + '/#ajouter')
        expect(p2.get_by_text('Service de traduction du site')).to_be_visible(timeout=15000)
        p2.fill('#add-input', 'to improve')
        p2.get_by_role('button', name='Rechercher').click()
        expect(p2.get_by_text('Plusieurs traductions possibles')).to_be_visible(timeout=15000)
        p2.screenshot(path=str(OUT / 'mobile-ajout-ambigu.png'), full_page=True)
        p2.get_by_text('Choisir ce sens').first.click()
        check('traduction proposée modifiable', p2.input_value('#add-fr') == 'améliorer' and p2.input_value('#add-ipa') == '/ɪmˈpɹʉːv/')
        p2.get_by_role('button', name='Ajouter à ma collection').click()
        expect(p2.get_by_text('ajouté à ta collection')).to_be_visible()
        # échec du service : pas de fausse traduction
        p2.unroute('**/api/lookup')
        p2.route('**/api/lookup', lambda r: r.fulfill(status=502, json={'error': 'Le service de traduction a répondu 502.'}) if r.request.method == 'POST' else r.fulfill(json={'ok': True, 'configured': True}))
        p2.get_by_role('button', name='Ajouter un autre mot').click()
        p2.fill('#add-input', 'kookaburra')
        p2.get_by_role('button', name='Rechercher').click()
        expect(p2.get_by_text('Le service de traduction a répondu 502.')).to_be_visible(timeout=15000)
        check('échec du service affiché sans simuler de traduction', p2.locator('#add-fr').count() == 0)
        ctx2.close()

        # ---------- 8. export / import
        page.goto(BASE + '/#parametres')
        with page.expect_download() as dl:
            page.get_by_role('button', name='Exporter la sauvegarde (JSON)').click()
        path = OUT / 'sauvegarde.json'
        dl.value.save_as(path)
        data = json.loads(path.read_text())
        check('export JSON complet', data['app'] == 'oz-vocab' and len(data['words']) == 501 and len(data['sessions']) >= 1, f"{len(data['words'])} mots, {len(data['sessions'])} sessions")
        with page.expect_download() as dl2:
            page.get_by_role('button', name='Exporter le vocabulaire (CSV)').click()
        csv_path = OUT / 'vocabulaire.csv'
        dl2.value.save_as(csv_path)
        check('export CSV', csv_path.read_text(encoding='utf-8-sig').count('\n') >= 500)
        # import dans un navigateur neuf
        ctx3 = browser.new_context(viewport={'width': 1280, 'height': 860}, locale='fr-FR')
        p3 = ctx3.new_page()
        p3.goto(BASE + '/#parametres')
        expect(p3.get_by_role('heading', name='Paramètres')).to_be_visible(timeout=15000)
        p3.set_input_files('input[type=file]', str(path))
        expect(p3.get_by_text('Contenu du fichier')).to_be_visible()
        p3.get_by_role('button', name='Importer', exact=True).click()
        expect(p3.get_by_text('Import terminé')).to_be_visible()
        p3.goto(BASE + '/#accueil')
        check('import : progression retrouvée sur un autre navigateur', p3.locator('dt:has-text("Nouveaux") + dd').first.inner_text().strip() == '490')
        p3.screenshot(path=str(OUT / 'desktop-accueil.png'), full_page=True)
        for r in ['explorer', 'stats', 'parametres', 'ajouter']:
            p3.goto(BASE + f'/#{r}')
            p3.wait_for_timeout(400)
            p3.screenshot(path=str(OUT / f'desktop-{r}.png'), full_page=True)
        p3.goto(BASE + '/#reviser')
        p3.get_by_role('button', name='Commencer').click()
        p3.wait_for_timeout(300)
        p3.screenshot(path=str(OUT / 'desktop-carte.png'))
        p3.keyboard.press('Space')
        check('raccourci clavier : Espace révèle la réponse', p3.get_by_role('button', name='Je connais').is_visible())
        p3.keyboard.press('2')
        p3.wait_for_timeout(200)
        ctx3.close()

        # ---------- 9. hors ligne (version web classique, service worker)
        page.goto(BASE + '/#accueil')
        page.wait_for_timeout(1500)
        page.reload()
        page.wait_for_timeout(1000)
        ctx.set_offline(True)
        page.reload()
        try:
            expect(page.get_by_role('heading', name='Tableau de bord')).to_be_visible(timeout=10000)
            ok = True
        except AssertionError:
            ok = False
        check('site disponible hors ligne (service worker)', ok)
        page.get_by_role('button', name='Commencer ma révision').click()
        page.get_by_role('button', name='Révéler la réponse').click()
        page.get_by_role('button', name='Je connais').click()
        check('révision hors ligne enregistrée', page.locator('p[aria-live="polite"]').first.is_visible())
        page.screenshot(path=str(OUT / 'mobile-hors-ligne.png'))
        ctx.set_offline(False)

        # ---------- 10. thème sombre
        page.goto(BASE + '/#parametres')
        page.get_by_role('radio', name='Sombre').click()
        page.goto(BASE + '/#accueil')
        page.screenshot(path=str(OUT / 'mobile-sombre.png'), full_page=True)
        page.goto(BASE + '/#parametres')
        page.get_by_role('radio', name='Clair').click()

        # le bac à sable de test bloque les sites externes (dictionaryapi.dev) : ces refus réseau ne sont pas des bogues
        real_errors = [e for e in errors if 'Failed to load resource' not in e and 'ERR_INTERNET_DISCONNECTED' not in e and 'dictionaryapi.dev' not in e]
        check('aucune erreur JavaScript', not real_errors, '; '.join(real_errors[:3]))
        browser.close()

    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} vérifications réussies')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    run()
