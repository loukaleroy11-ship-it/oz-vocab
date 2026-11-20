#!/usr/bin/env python3
"""
Construit src/data/coreWords.json, la base des 500 mots initiaux.

Sources (toutes dans scripts/source-data/) :
  - NGSL-Spoken 1.2 (Browne & Culligan), CC BY-SA 4.0
      ngsls_stats.csv              -> rang + fréquence U (occurrences estimées par million de mots)
      ngsls_lemm.csv               -> formes fléchies de chaque lemme
  - Britfone 3.0.1 (J. Llarena), licence MIT
      britfone.main.3.0.1.csv      -> transcription IPA britannique (SSB)
  - fr_entries.tsv                 -> traductions, catégories, exemples (rédigés pour ce projet)

Méthode :
  1. On trie NGSL-Spoken par rang.
  2. On corrige l'entrée « true » (convertie en booléen TRUE par Excel dans le fichier
     source, rang manquant 337).
  3. On retire 5 balises de transcription du corpus oral qui ne sont pas du vocabulaire :
     pause, unclear, laughter, breath, cough.
  4. On garde les 500 premiers lemmes restants (rangs source 1 à 505), sans changer l'ordre.
  5. On convertit l'IPA britannique en IPA australienne (système Cox & Palethorpe 2007,
     JIPA « Australian English ») par correspondance de phonèmes, et on place l'accent
     tonique au début de la syllabe (principe de l'attaque maximale).

Usage : python3 scripts/build_dataset.py
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "source-data"
OUT = ROOT / "src" / "data" / "coreWords.json"

# fragments de contractions / transcriptions phonétiques présents dans les familles NGSL
FORM_FRAGMENTS = {
    "m", "s", "t", "d", "ll", "ve", "re", "isn", "aren", "wasn", "weren", "hasn", "haven",
    "hadn", "don", "doesn", "didn", "won", "wouldn", "couldn", "shouldn", "mustn", "mightn",
    "shan", "ain", "em", "im", "y", "ye", "ya", "gonna", "gotta", "wanna", "goin", "gettin",
    "doin", "sayin", "nothin", "somethin", "anythin", "cos", "coz", "cause", "i",
    "bein", "hafta", "ands", "buts",
}
TRANSCRIPTION_TAGS = {"pause", "unclear", "laughter", "breath", "cough"}
TARGET = 500

# Orthographe australienne pour l'affichage (le rang n'est pas modifié)
DISPLAY_SPELLING = {"color": "colour"}
ALT_SPELLING = {"color": ["color (US)"]}

POS_CODES = {
    "n": "noun", "v": "verb", "adj": "adjective", "adv": "adverb",
    "prep": "preposition", "pron": "pronoun", "det": "determiner",
    "conj": "conjunction", "aux": "auxiliary", "interj": "interjection",
    "num": "number",
}

# Britfone (SSB) -> australien (Cox & Palethorpe 2007)
VOWELS = {
    "iː": "iː", "ɪ": "ɪ", "ɛ": "e", "æ": "æ", "ɐ": "ɐ", "ɑː": "ɐː",
    "ɒ": "ɔ", "ɔː": "oː", "ʊ": "ʊ", "uː": "ʉː", "ɜː": "ɜː", "ə": "ə",
    "eɪ": "æɪ", "aɪ": "ɑe", "ɔɪ": "oɪ", "aʊ": "æɔ", "əʊ": "əʉ",
    "ɪə": "ɪə", "ɛə": "eː", "ʊə": "ʊə", "i": "i",
}
CONSONANTS = {
    "b", "d", "dʒ", "f", "g", "h", "j", "k", "l", "m", "n", "p", "s", "t",
    "tʃ", "v", "w", "z", "ð", "ŋ", "ɹ", "ʃ", "ʒ", "θ",
}
LEGAL_ONSETS = {
    # 2 consonnes
    "p ɹ", "p l", "p j", "b ɹ", "b l", "b j", "t ɹ", "t w", "t j", "d ɹ", "d w",
    "d j", "k ɹ", "k l", "k w", "k j", "g ɹ", "g l", "g w", "f ɹ", "f l", "f j",
    "v j", "θ ɹ", "θ w", "ʃ ɹ", "s p", "s t", "s k", "s m", "s n", "s l", "s w",
    "s f", "s j", "m j", "n j", "h j", "l j",
    # 3 consonnes
    "s p ɹ", "s p l", "s p j", "s t ɹ", "s t j", "s k ɹ", "s k l", "s k w", "s k j",
}

# Choix de la prononciation de citation (index Britfone) et variantes affichées.
# Par défaut : la 1re entrée, sans variante.
PRON_CHOICE = {
    # mots grammaticaux : forme forte en citation, forme faible en variante
    "be": (1, [0]), "the": (2, [0]), "you": (2, [0]), "and": (1, [0]), "it": (0, []),
    "to": (2, [0]), "a": (1, [0]), "have": (1, [0]), "of": (1, [0]), "that": (1, [0]),
    "in": (0, []), "this": (0, []), "for": (1, [0]), "will": (1, [0]), "just": (1, []),
    "with": (2, []), "if": (0, []), "at": (1, [0]), "or": (1, []), "as": (0, [1]),
    "can": (1, [0]), "than": (1, [0]), "into": (2, []),
    # sens différents selon la prononciation
    "use": (1, [0]), "live": (0, [1]), "read": (0, [1]), "close": (1, [0]),
    "record": (0, [1]), "present": (1, [0]), "either": (1, [0]),
    # meilleure forme de citation / plus proche de l'usage australien
    "outside": (1, []), "enjoy": (1, []), "fifteen": (1, []), "nineteen": (1, []),
    "sometimes": (1, []), "yourself": (2, []),
}


def load_britfone():
    d = defaultdict(list)
    with open(SRC / "britfone.main.3.0.1.csv", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            w, p = line.split(", ", 1)
            d[re.sub(r"\(\d+\)$", "", w)].append(p.split())
    return d


def to_australian_ipa(tokens):
    """tokens Britfone (ex. ['ə','b','ˈæ','k']) -> '/əˈbæk/' en IPA australienne."""
    segs = []  # (symbole, est_voyelle, accent)
    for t in tokens:
        stress = ""
        if t[0] in "ˈˌ":
            stress, t = t[0], t[1:]
        if t in VOWELS:
            segs.append([VOWELS[t], True, stress])
        elif t in CONSONANTS:
            segs.append(["ɡ" if t == "g" else t, False, ""])
        else:
            raise ValueError(f"symbole inconnu {t!r} dans {tokens}")
    # position des marques d'accent : avant l'attaque maximale légale
    marks = {}
    for i, (sym, is_v, stress) in enumerate(segs):
        if not (is_v and stress):
            continue
        j = i
        while j - 1 >= 0 and not segs[j - 1][1]:
            cluster = " ".join(s[0] if s[0] != "ɡ" else "g" for s in segs[j - 1:i])
            if (i - (j - 1)) == 1:
                if segs[j - 1][0] == "ŋ":
                    break
                j -= 1
                continue
            if cluster in LEGAL_ONSETS:
                j -= 1
                continue
            break
        marks[j] = stress
    # pas de marque d'accent sur un monosyllabe (convention des dictionnaires)
    if sum(1 for s in segs if s[1]) == 1:
        marks = {}
    out = []
    for i, (sym, _, _) in enumerate(segs):
        if i in marks:
            out.append(marks[i])
        out.append(sym)
    return "/" + "".join(out) + "/"


CEFR_FILES = ["cefrj-vocabulary-profile-1.5.csv", "octanove-vocabulary-profile-c1c2-1.0.csv"]
CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


def load_cefr():
    """CEFR-J 1.5 (A1-B2) + Octanove (C1-C2) : mot -> {catégorie: niveau le plus bas}."""
    table = {}
    for name in CEFR_FILES:
        path = SRC / name
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            for r in csv.DictReader(f):
                lvl = r["CEFR"].strip().upper()
                if lvl not in CEFR_ORDER:
                    continue
                for head in r["headword"].split("/"):
                    head = head.strip().lower()
                    if not head:
                        continue
                    d = table.setdefault(head, {})
                    pos = r["pos"].strip().lower()
                    if pos not in d or CEFR_ORDER.index(lvl) < CEFR_ORDER.index(d[pos]):
                        d[pos] = lvl
    return table


CEFR_POS = {"auxiliary": "verb", "number": "number"}


def cefr_level(table, en, lemma, pos):
    """Niveau du sens principal ; à défaut le plus bas toutes catégories ; à défaut A1 (mots oraux très fréquents)."""
    for key in (en.lower(), lemma.lower()):
        d = table.get(key)
        if d:
            want = CEFR_POS.get(pos, pos)
            if want in d:
                return d[want]
            return min(d.values(), key=CEFR_ORDER.index)
    return "A1"


def main():
    rows = list(csv.DictReader(open(SRC / "ngsls_stats.csv", encoding="utf-8-sig")))
    for r in rows:
        if r["Lemma"] == "TRUE" and r["Rank"] == "#N/A":
            r["Lemma"], r["Rank"], r["SFI"], r["U"] = "true", "337", "", ""
    rows = [r for r in rows if r["Rank"].strip().isdigit()]
    rows.sort(key=lambda r: int(r["Rank"]))
    kept = [r for r in rows if r["Lemma"] not in TRANSCRIPTION_TAGS][:TARGET]
    assert len(kept) == TARGET

    forms = {}
    for line in open(SRC / "ngsls_lemm.csv", encoding="utf-8-sig"):
        parts = [p.strip() for p in line.strip().split(",") if p.strip()]
        if parts:
            forms[parts[0].lower()] = parts

    entries = {}
    with open(SRC / "fr_entries.tsv", encoding="utf-8") as f:
        header = f.readline().rstrip("\n").split("|")
        for n, line in enumerate(f, start=2):
            line = line.rstrip("\n")
            if not line:
                continue
            cols = line.split("|")
            if len(cols) != len(header):
                sys.exit(f"fr_entries.tsv ligne {n}: {len(cols)} colonnes au lieu de {len(header)}")
            e = dict(zip(header, cols))
            if e["lemma"] in entries:
                sys.exit(f"doublon dans fr_entries.tsv : {e['lemma']}")
            entries[e["lemma"]] = e

    britfone = load_britfone()
    lemmas = [r["Lemma"] for r in kept]
    missing = [l for l in lemmas if l not in entries]
    extra = [l for l in entries if l not in lemmas]
    if missing or extra:
        sys.exit(f"entrées manquantes: {missing}\nentrées en trop: {extra}")

    # U manquant pour « true » (ligne corrompue dans la source) : on l'estime
    # par interpolation entre ses voisins de rang 336 et 338.
    by_rank = {int(r["Rank"]): r for r in kept}
    for r in kept:
        if not r["U"]:
            a, b = float(by_rank[int(r["Rank"]) - 1]["U"]), float(by_rank[int(r["Rank"]) + 1]["U"])
            r["U"] = f"{(a + b) / 2:.2f}"
            r["U_estimated"] = True

    words = []
    seen_en = set()
    cefr = load_cefr()
    for i, r in enumerate(kept, start=1):
        lemma = r["Lemma"]
        e = entries[lemma]
        pos_codes = [p.strip() for p in e["pos"].split(",") if p.strip()]
        for p in pos_codes:
            if p not in POS_CODES:
                sys.exit(f"catégorie inconnue {p!r} pour {lemma}")
        prons = britfone[lemma.upper()]
        main_idx, alt_idx = PRON_CHOICE.get(lemma, (0, []))
        ipa = to_australian_ipa(prons[main_idx])
        ipa_alt = [to_australian_ipa(prons[k]) for k in alt_idx]
        en = DISPLAY_SPELLING.get(lemma, lemma)
        key = en.lower()
        if key in seen_en:
            sys.exit(f"doublon anglais : {en}")
        seen_en.add(key)
        f_list = [x for x in forms.get(lemma.lower(), [lemma]) if x.lower() not in FORM_FRAGMENTS]
        words.append({
            "id": f"core-{i:03d}",
            "rank": i,
            "sourceRank": int(r["Rank"]),
            "en": en,
            "lemma": lemma,
            "spellingAlt": ALT_SPELLING.get(lemma, []),
            "forms": [x for x in f_list if x.lower() != en.lower()],
            "pos": POS_CODES[pos_codes[0]],
            "posAlt": [POS_CODES[p] for p in pos_codes[1:]],
            "fr": e["fr"].strip(),
            "frAlt": [x.strip() for x in e["frAlt"].split(";") if x.strip()],
            "ipa": ipa,
            "ipaAlt": ipa_alt,
            "exampleEn": e["exampleEn"].strip(),
            "exampleFr": e["exampleFr"].strip(),
            "freqPerMillion": round(float(r["U"]), 2),
            "cefr": cefr_level(cefr, en, lemma, POS_CODES[pos_codes[0]]),
            **({"freqEstimated": True} if r.get("U_estimated") else {}),
        })

    # contrôles qualité
    ex = [w["exampleEn"].lower() for w in words]
    dup_ex = {x for x in ex if ex.count(x) > 1}
    if dup_ex:
        sys.exit(f"exemples en double : {dup_ex}")
    for w in words:
        for k in ("fr", "exampleEn", "exampleFr"):
            if not w[k]:
                sys.exit(f"champ vide {k} pour {w['en']}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    meta = {
        "source": "NGSL-Spoken 1.2 (Browne & Culligan, 2017) — CC BY-SA 4.0",
        "sourceUrl": "https://www.newgeneralservicelist.com/ngsl-spoken",
        "ipaSource": "Britfone 3.0.1 (MIT) converti en IPA australienne (Cox & Palethorpe 2007)",
        "removedTags": sorted(TRANSCRIPTION_TAGS),
        "cefrSource": "CEFR-J Wordlist 1.5 (Tono Lab, TUFS) + Octanove Vocabulary Profile C1/C2 1.0 (CC BY-SA 4.0)",
        "count": len(words),
    }
    OUT.write_text(json.dumps({"meta": meta, "words": words}, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"OK : {len(words)} mots -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
