#!/usr/bin/env python3
"""
Parcours Oz Vocab 2.0 dans un vrai navigateur (Chromium, Playwright).

Usage :
  npm run build && npx vite preview --port 4173
  python3 scripts/e2e_v2.py http://localhost:4173 ./captures

Vérifie : test de placement (mots jugés connus, pas reproposés comme nouveaux),
cartes français → anglais à l'oral et à l'écrit (faute tolérée, erreur signalée),
alternance nouvelle liste / mots à dire, fiches des 5 temps (quiz) et des mots
apparentés, progrès par niveau, affichage mobile sans défilement horizontal.
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'captures')
OUT.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parent.parent
CORE = json.loads((ROOT / 'src/data/coreWords.json').read_text(encoding='utf-8'))['words']
FR_OF = {w['en']: w['fr'] for w in CORE}
RANK_OF = {w['en']: w['rank'] for w in CORE}
PACK = json.loads((ROOT / 'src/data/packWords.json').read_text(encoding='utf-8'))['words']
RANK_OF.update({w['en']: w['rank'] for w in PACK})
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = ''):
    results.append((name, ok, detail))
    print(('✔' if ok else '✘'), name, detail)


def no_horizontal_scroll(page) -> bool:
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')


def step_value(page, title: str) -> str:
    return page.locator(f'ol[aria-label="Ordre de la séance"] li:has-text("{title}") .font-display').first.inner_text().strip()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        iphone = p.devices['iPhone 13']
        ctx = browser.new_context(**iphone, locale='fr-FR', timezone_id='Australia/Perth')
        page = ctx.new_page()
        errors: list[str] = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)

        # ---------- 1. accueil : invitation au test de placement
        page.goto(BASE + '/#accueil')
        expect(page.get_by_role('heading', name='Séance du jour')).to_be_visible(timeout=15000)
        check('accueil : invitation au test de placement', page.get_by_role('link', name='Faire le test').first.is_visible())
        nav = page.get_by_role('navigation', name='Navigation principale').last.inner_text()
        check('5 onglets : Accueil, Réviser, S’exprimer, Vocabulaire, Progrès', all(t in nav for t in ['Accueil', 'Réviser', 'S’exprimer', 'Vocabulaire', 'Progrès']), nav.replace('\n', ' · '))
        page.screenshot(path=str(OUT / 'v2-mobile-accueil.png'), full_page=True)

        # ---------- 2. test de placement : 2 premières tranches justes, puis « Je ne sais pas »
        page.goto(BASE + '/#placement')
        page.get_by_role('button', name='Commencer le test').click()
        asked = 0
        letters_right = []
        while page.get_by_text('Quelle est la traduction ?').count() and asked < 60:
            en = page.locator('article h2').inner_text().strip()
            header = page.locator('main').inner_text()
            m = re.search(r'mots (\d+) à', header)
            first = int(m.group(1)) if m else 999
            if asked == 0:
                page.screenshot(path=str(OUT / 'v2-mobile-placement.png'))
            if first <= 51:
                fr = FR_OF[en]
                buttons = page.locator('article ul li button')
                texts = [b.strip() for b in buttons.all_inner_texts()]
                idx = next((i for i, t in enumerate(texts[:4]) if t.endswith(fr) and t[1:].strip() == fr), 4)
                letters_right.append('ABCDE'[idx])
                buttons.nth(idx).click()
            else:
                page.get_by_role('button', name='Je ne sais pas').click()
            asked += 1
            page.wait_for_timeout(30)
        expect(page.get_by_role('heading', name='Résultat')).to_be_visible()
        res = page.locator('main').inner_text()
        check('placement : arrêt automatique après 2 tranches faibles', asked == 16, f'{asked} questions')
        check('placement : E « Aucune des propositions » est parfois la bonne réponse', 'E' in letters_right and len(set(letters_right)) >= 3, ''.join(letters_right))
        check('placement : 100 mots jugés connus', '100 mots jugés connus' in res, res[:160].replace('\n', ' '))
        page.screenshot(path=str(OUT / 'v2-mobile-placement-resultat.png'), full_page=True)

        page.goto(BASE + '/#accueil')
        expect(page.get_by_role('heading', name='Séance du jour')).to_be_visible()
        check('accueil : 400 nouveaux mots restants (+ paquets)', step_value(page, 'Nouveaux mots') == str(400 + len(PACK)), step_value(page, 'Nouveaux mots'))
        check('accueil : 100 mots prêts à être dits en anglais', step_value(page, 'À dire pour la 1re fois') == '100')
        check('invitation au placement masquée une fois le test fait', page.get_by_role('link', name='Faire le test').count() == 0)

        # ---------- 3. première nouvelle liste : aucun mot jugé connu
        page.locator('main').get_by_role('button', name='Commencer', exact=True).click()
        expect(page.get_by_role('button', name='Révéler la réponse')).to_be_visible()
        ranks = []
        while page.get_by_role('button', name='Révéler la réponse').count():
            en = page.locator('article h2').first.inner_text().strip()
            ranks.append(RANK_OF.get(en, 0))
            page.get_by_role('button', name='Révéler la réponse').click()
            page.get_by_role('button', name='Je connais').click()
            page.wait_for_timeout(30)
        check('nouvelle liste : mots après les 100 jugés connus', ranks and min(ranks) > 100, str(ranks))
        nxt = page.get_by_role('button', name='À dire en anglais')
        check('après une nouvelle liste : liste « À dire en anglais » proposée', nxt.count() == 1, nxt.inner_text() if nxt.count() else '')

        # ---------- 4. cartes français → anglais
        nxt.click()
        card = page.locator('article[data-track="prod"]')
        expect(card).to_be_visible()
        check('carte FR → EN : français affiché, anglais caché', 'Français → anglais' in card.inner_text() and card.locator('h2[lang="en"]').count() == 0)
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / 'v2-mobile-carte-produire.png'))
        page.get_by_role('button', name='Indice').click()
        check('indice : première lettre', bool(re.search(r'^\w( _)*', card.locator('p.font-mono').inner_text())), card.locator('p.font-mono').inner_text())
        page.get_by_role('button', name='Vérifier').click()
        en_shown = card.locator('h2[lang="en"]').inner_text().strip()
        check('à l’oral : la vérification montre le mot anglais', en_shown in RANK_OF, en_shown)
        page.screenshot(path=str(OUT / 'v2-mobile-carte-produire-revelee.png'))
        page.get_by_role('button', name='Je l’avais').click()

        # passage à l'écrit, faute de frappe tolérée
        page.get_by_role('radio', name='À l’écrit').click()
        fr = card.locator('h2').first.inner_text().strip()
        candidates = [w for w in CORE if w['fr'] == fr and w['rank'] <= 100]
        target = candidates[0]['en'] if candidates else ''
        typo = target if len(target) <= 3 else target[0] + target[2] + target[1] + target[3:]
        page.fill('#prod-input', typo)
        page.keyboard.press('Enter')
        verdict = page.locator('article p[role="status"]').inner_text()
        ok_verdict = any(t in verdict for t in ['petite faute', 'Exact', 'conjuguée']) or (len(candidates) > 1 and 'veut aussi dire' in verdict)
        check('à l’écrit : faute de frappe tolérée', ok_verdict, f'{fr} → {typo} : {verdict}')
        page.screenshot(path=str(OUT / 'v2-mobile-carte-ecrite.png'))
        page.get_by_role('button', name='Je l’avais').click()
        page.fill('#prod-input', 'zzzz')
        page.keyboard.press('Enter')
        verdict = page.locator('article p[role="status"]').inner_text()
        check('à l’écrit : mauvaise réponse signalée, « Je ne l’avais pas » suggéré', 'Pas tout à fait' in verdict and 'ring-4' in (page.get_by_role('button', name='Je ne l’avais pas').get_attribute('class') or ''), verdict)
        page.get_by_role('button', name='Je ne l’avais pas').click()
        page.get_by_role('radio', name='À l’oral').click()
        page.get_by_role('button', name='Pause').click()

        # ---------- 5. S'exprimer : les 5 temps + quiz
        page.goto(BASE + '/#temps')
        expect(page.get_by_role('heading', name='Les 5 temps essentiels')).to_be_visible()
        check('5 fiches de temps', page.locator('details').count() == 5)
        check('fiche : quand / comment / pièges / à voix haute', all(t in page.locator('details').first.inner_text().lower() for t in ['quand l’utiliser', 'comment le former', 'pièges de francophone', 'à toi, à voix haute']))
        quiz = page.locator('section[aria-labelledby="quiz-title"]')
        quiz.locator('ul li button').first.click()
        check('quiz : correction expliquée après la réponse', quiz.get_by_role('status').count() == 1 and len(quiz.get_by_role('status').inner_text()) > 20)
        check('quiz : option E « Aucune des propositions… »', 'Aucune des propositions ci-dessus n’est exacte.' in quiz.inner_text())
        check('mobile : pas de défilement horizontal (s’exprimer)', no_horizontal_scroll(page))
        page.screenshot(path=str(OUT / 'v2-mobile-exprimer.png'), full_page=True)

        # ---------- 6. mots apparentés
        page.goto(BASE + '/#explorer')
        page.get_by_role('link', name='Mots apparentés').click()
        expect(page.get_by_role('heading', name='Mots apparentés')).to_be_visible()
        txt = page.locator('main').inner_text()
        check('règles des mots apparentés (-eux → -ous, -té → -ty, circonflexe → s)', all(t in txt for t in ['-eux · -euse', '-ous', '-ty', 'forest']))
        check('faux amis et orthographe australienne', 'actually' in txt and 'colour' in txt)
        check('mobile : pas de défilement horizontal (mots apparentés)', no_horizontal_scroll(page))
        page.screenshot(path=str(OUT / 'v2-mobile-apparentes.png'), full_page=True)

        # ---------- 7. progrès par niveau
        page.goto(BASE + '/#stats')
        expect(page.get_by_role('heading', name='Progrès')).to_be_visible()
        lv = page.locator('section[aria-labelledby="lv-title"]').inner_text()
        check('progrès : reconnus et productibles par niveau', 'A1' in lv and 'Reconnus' in lv and 'Productibles' in lv, lv[:120].replace('\n', ' '))

        # ---------- 8. fiche d'un mot : deux suivis
        page.goto(BASE + '/#explorer')
        page.fill('#explore-search', 'have')
        page.wait_for_timeout(300)
        page.locator('main ul li button.text-left').first.click()
        expect(page.get_by_role('dialog')).to_be_visible()
        dlg = page.get_by_role('dialog').inner_text().lower()
        check('fiche du mot : deux suivis affichés', 'reconnaître (anglais → français)' in dlg and 'dire en anglais' in dlg, dlg[-300:].replace('\n', ' '))

        # ---------- 9. S'exprimer : hub et exercices
        page.goto(BASE + '/#exprimer')
        expect(page.get_by_role('heading', name='S’exprimer')).to_be_visible()
        hub = page.locator('main').inner_text()
        check('hub : 7 exercices + fiches', all(t in hub for t in ['Phrase avec le mot', 'Le mot juste', 'Plus naturel', 'Reformuler', 'Situations', 'Réponse rapide', 'Mon histoire', 'Prononciation', 'Les 5 temps essentiels']))
        check('mobile : pas de défilement horizontal (hub)', no_horizontal_scroll(page))
        page.screenshot(path=str(OUT / 'v2-mobile-hub.png'), full_page=True)

        page.goto(BASE + '/#ex-motjuste')
        page.locator('main article ul li button').first.click()
        st = page.locator('main [role="status"]').first.inner_text()
        check('le mot juste : correction et explication', ('Bonne réponse' in st or 'Réponse :' in st) and len(st) > 30, st[:80].replace('\n', ' '))
        page.screenshot(path=str(OUT / 'v2-mobile-motjuste.png'), full_page=True)
        page.get_by_role('button', name='Suivante').click()
        check('le mot juste : question suivante', 'Question 2 / 6' in page.locator('main').inner_text())

        page.goto(BASE + '/#ex-situations')
        page.locator('main ul li button').first.click()
        page.get_by_role('button', name='Je suis prêt').click()
        page.get_by_role('button', name='Voir les réponses modèles').click()
        sit = page.locator('main').inner_text()
        check('situation : réponse modèle + un cran au-dessus', 'RÉPONSE MODÈLE' in sit.upper() and 'UN CRAN AU-DESSUS' in sit.upper())
        page.screenshot(path=str(OUT / 'v2-mobile-situation.png'), full_page=True)
        boxes = page.locator('main input[type=checkbox]')
        boxes.nth(0).check()
        boxes.nth(1).check()
        page.get_by_role('button', name='Valider (2/3)').click()
        check('situation réussie enregistrée', page.get_by_text('réussie').first.is_visible())

        page.goto(BASE + '/#ex-naturel')
        page.get_by_role('button', name='Voir la version naturelle').click()
        check('plus naturel : version corrigée affichée', page.locator('main p.text-gum').count() >= 1)

        page.goto(BASE + '/#ex-rapide')
        page.locator('main').get_by_role('button', name='Commencer').click()
        check('réponse rapide : minuteur de 20 s', bool(re.search(r'\b(20|19|18) s\b', page.locator('main').inner_text())))
        for _ in range(10):
            page.get_by_role('button', name='Question suivante').click()
        check('réponse rapide : exemples de réponses à la fin', page.get_by_text('Exemples de réponses').is_visible())

        page.goto(BASE + '/#prononciation')
        check('prononciation : 12 fiches à écouter et répéter', page.locator('main details').count() == 12)
        page.screenshot(path=str(OUT / 'v2-mobile-prononciation.png'), full_page=True)

        page.goto(BASE + '/#accueil')
        acc = page.locator('main').inner_text()
        check('accueil : niveau en cours et critères', 'Niveau en cours' in acc and 'situations' in acc)
        page.goto(BASE + '/#parametres')
        check('réglages : paquets activables', page.get_by_role('button', name=re.compile('Phrasal verbs')).count() == 1)

        real_errors = [e for e in errors if 'Failed to load resource' not in e and 'dictionaryapi.dev' not in e]
        check('aucune erreur JavaScript', not real_errors, '; '.join(real_errors[:3]))
        browser.close()

    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} vérifications réussies')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    run()
