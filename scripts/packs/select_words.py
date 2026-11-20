#!/usr/bin/env python3
"""Sélectionne les mots des paquets B1 / B2 / C1 : niveau CEFR-J 1.5 (A1-B2) ou
Octanove (C1), classés par fréquence orale (sous-titres OpenSubtitles,
FrequencyWords 2018, CC BY-SA 4.0), hors des 500 mots de base.
Écrit scripts/source-data/packs/selection.tsv (niveau, mot, catégorie, fréquence)."""
import csv, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts" / "source-data"
SIZES = {"B1": 700, "B2": 650, "C1": 450}
POS = {"noun": "n", "verb": "v", "adjective": "adj", "adverb": "adv", "preposition": "prep", "conjunction": "conj",
       "pronoun": "pron", "determiner": "det", "interjection": "interj", "modal verb": "v", "be-verb": "v", "do-verb": "v", "have-verb": "v"}

freq = {}
for line in (SRC / "en_50k.txt").read_text(encoding="utf-8").splitlines():
    w, n = line.rsplit(" ", 1)
    freq[w] = int(n)

def score(w):
    s = freq.get(w, 0)
    for suf in ("s", "es", "ed", "d", "ing"):
        s += freq.get(w + suf, 0) // 2
    if w.endswith("e"):
        s += freq.get(w[:-1] + "ing", 0) // 2
    if w.endswith("y"):
        s += freq.get(w[:-1] + "ies", 0) // 2
    return s

core = json.loads((ROOT / "src/data/coreWords.json").read_text(encoding="utf-8"))["words"]
taken = {w["en"].lower() for w in core} | {w["lemma"].lower() for w in core}
for w in core:
    taken.update(f.lower() for f in w["forms"])

# artefacts de sous-titres et prénoms
EXCLUDE = set("""haven bee sigh chuckle laughter applause max ray hop frank doc mommy daddy gay sex dude ma pa mm hmm uh um
ok okay yeah yes no oh wow huh ha la mr mrs ms dr""".split())
# les sous-titres de films sur-représentent le crime et la guerre : ces mots restent, mais plus loin
MOVIE = set("""kill murder gun shoot shot dead death blood cop detective killer killing weapon bullet prison jail victim
suicide crime criminal arrest bomb witness suspect investigation war army soldier battle enemy attack heaven hell angel
ghost monster king queen prince princess captain sir lady holy soul spirit devil sake honor swear sweetheart honey
guilty innocent court judge justice agent mission command officer chief grace pray bless fool damn bitch""".split())

def adjusted(w):
    return score(w) * (0.25 if w in MOVIE else 1)

best = {}
for name in ("cefrj-vocabulary-profile-1.5.csv", "octanove-vocabulary-profile-c1c2-1.0.csv"):
    with (SRC / name).open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            lvl = r["CEFR"].strip().upper()
            pos = POS.get(r["pos"].strip().lower())
            if not pos:
                continue
            for head in r["headword"].split("/"):
                h = head.strip()
                if not re.fullmatch(r"[a-z][a-z\-]+", h) or h in taken or h in EXCLUDE:
                    continue
                cur = best.get(h)
                if cur is None or "A1A2B1B2C1C2".index(lvl) < "A1A2B1B2C1C2".index(cur[0]):
                    best[h] = (lvl, pos)

rows = []
for lvl, size in SIZES.items():
    want = ("A1", "A2", "B1") if lvl == "B1" else (lvl,)
    cands = sorted((w for w, (l, p) in best.items() if l in want), key=lambda w: -adjusted(w))
    for w in cands[:size]:
        rows.append((lvl, w, best[w][1], score(w)))
out = SRC / "packs" / "selection.tsv"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join("\t".join(map(str, r)) for r in rows) + "\n", encoding="utf-8")
print(len(rows), {l: sum(1 for r in rows if r[0] == l) for l in SIZES})
