#!/usr/bin/env python3
"""
Construit src/data/packWords.json : paquets B1, B2, C1, phrasal verbs, expressions,
anglais australien, vocabulaire professionnel (scripts/source-data/packs/*.txt).

- Les mots déjà présents dans les 500 sont ignorés ; un doublon entre paquets est
  fusionné (ses autres sens s'ajoutent à la première entrée).
- Ordre d'apprentissage : bloc B1 (A1–B1), puis B2, puis C1. Dans chaque bloc,
  les mots de niveau suivent l'ordre du fichier (fréquence orale) et les paquets
  thématiques (phrasal verbs…) sont insérés par petits groupes du même thème.
- Niveau CECRL : CEFR-J / Octanove quand le mot y figure, sinon le niveau indiqué.
- IPA australienne : Britfone converti (même méthode que les 500 mots), mot par mot.
- Variantes américaines acceptées en réponse tapée (colour → color, realise → realize…).
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_dataset import load_britfone, to_australian_ipa, load_cefr, CEFR_ORDER  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "source-data"
PACKS = SRC / "packs"
OUT = ROOT / "src" / "data" / "packWords.json"

POS = {"n": "noun", "v": "verb", "adj": "adjective", "adv": "adverb", "prep": "preposition", "conj": "conjunction",
       "pron": "pronoun", "det": "determiner", "interj": "interjection", "expression": "expression"}
CURATED = [("phrasal", "phrasal verbs"), ("idioms", "expressions"), ("aussie", "australien"), ("work", "travail")]
LEVELS = [("b1", "B1"), ("b2", "B2"), ("c1", "C1")]
BLOCK_OF = {"A1": "B1", "A2": "B1", "B1": "B1", "B2": "B2", "C1": "C1", "C2": "C1"}
CHUNK = 6
SENTENCE_END = re.compile(r"[.!?»\"]\s*$")


def split_alts(s):
    return [x.strip() for x in s.split(";") if x.strip()]


def parse_curated(name):
    entries, group = [], None
    for raw in (PACKS / f"{name}.txt").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("# "):
            continue
        if line.startswith("## "):
            group = line[3:].strip()
            continue
        f = [x.strip() for x in line.split("|")]
        if len(f) < 6:
            sys.exit(f"{name} : ligne incomplète : {line}")
        en, pos, level, fr = f[0], f[1], f[2], f[3]
        # repère l'exemple : deux champs consécutifs terminés par une ponctuation de phrase
        k = next((i for i in range(4, len(f) - 1) if SENTENCE_END.search(f[i]) and SENTENCE_END.search(f[i + 1])), None)
        if k is None:
            sys.exit(f"{name} : exemple introuvable : {line}")
        alts = [a for x in f[4:k] for a in split_alts(x)]
        note = " · ".join(f[k + 2:]) or None
        if pos not in POS or level not in CEFR_ORDER:
            sys.exit(f"{name} : catégorie ou niveau inconnu : {line}")
        entries.append(dict(en=en, pos=POS[pos], level=level, fr=fr, frAlt=alts, exampleEn=f[k], exampleFr=f[k + 1],
                            note=note, theme=group))
    return entries


def parse_level(name):
    entries = []
    for raw in (PACKS / f"{name}.txt").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        f = [x.strip() for x in line.split("|")]
        if len(f) < 3 or f[1] not in POS:
            sys.exit(f"{name} : ligne invalide : {line}")
        entries.append(dict(en=f[0], pos=POS[f[1]], fr=f[2], frAlt=split_alts(f[3]) if len(f) > 3 else [],
                            exampleEn="", exampleFr="", note=None, theme=None))
    return entries


def main():
    core = json.loads((ROOT / "src/data/coreWords.json").read_text(encoding="utf-8"))["words"]
    core_keys = {w["en"].lower() for w in core} | {w["lemma"].lower() for w in core}
    freq = set()
    for line in (SRC / "en_50k.txt").read_text(encoding="utf-8").splitlines():
        freq.add(line.rsplit(" ", 1)[0])
    britfone = load_britfone()
    cefr = load_cefr()

    def ipa_of(en):
        parts = []
        for tok in re.split(r"[\s\-]+", en.replace("’", "'")):
            t = tok.strip(".,!?").upper()
            if not t:
                continue
            prons = britfone.get(t)
            if not prons:
                return None
            parts.append(to_australian_ipa(prons[0]).strip("/"))
        return "/" + " ".join(parts) + "/" if parts else None

    def us_variants(en):
        if " " in en:
            return []
        cands = set()
        for a, b in (("our", "or"), ("ise", "ize"), ("isation", "ization"), ("yse", "yze"), ("lled", "led"),
                     ("lling", "ling"), ("ogue", "og"), ("ence", "ense")):
            if a in en:
                cands.add(en.replace(a, b))
        if en.endswith(("tre", "bre")):
            cands.add(en[:-2] + "er")
        return sorted(c for c in cands if c != en and c in freq)

    def level_of(en, pos, default):
        d = cefr.get(en.lower())
        if not d:
            return default
        want = "verb" if pos == "verb" else pos
        lvl = d.get(want) or min(d.values(), key=CEFR_ORDER.index)
        return lvl

    seen = {}
    packs = {}
    for name, label in CURATED:
        items = []
        for e in parse_curated(name):
            key = e["en"].lower()
            if key in core_keys:
                continue
            if key in seen:
                prev = seen[key]
                prev["frAlt"] += [x for x in [e["fr"], *e["frAlt"]] if x not in prev["frAlt"] and x != prev["fr"]]
                continue
            e.update(pack=name, group=f"t:{label} · {e['theme']}" if e["theme"] else f"pack:{name}", cefr=e["level"])
            seen[key] = e
            items.append(e)
        packs[name] = items
    for name, lvl in LEVELS:
        items = []
        for e in parse_level(name):
            key = e["en"].lower()
            if key in core_keys:
                continue
            if key in seen:
                prev = seen[key]
                prev["frAlt"] += [x for x in [e["fr"], *e["frAlt"]] if x not in prev["frAlt"] and x != prev["fr"]]
                continue
            e.update(pack=name, group=f"pos:{e['pos']}", cefr=level_of(e["en"], e["pos"], lvl))
            seen[key] = e
            items.append(e)
        packs[name] = items

    # ordre d'apprentissage
    ordered = []
    for name, block in LEVELS:
        level_words = packs[name]
        curated = [e for n, _ in CURATED for e in packs[n] if BLOCK_OF[e["level"]] == block]
        chunks, cur = [], []
        for e in curated:
            if cur and (cur[-1]["group"] != e["group"] or len(cur) >= CHUNK):
                chunks.append(cur)
                cur = []
            cur.append(e)
        if cur:
            chunks.append(cur)
        every = max(8, len(level_words) // max(1, len(chunks)))
        out, ci = [], 0
        for i, w in enumerate(level_words):
            if i % every == 0 and ci < len(chunks):
                out.extend(chunks[ci])
                ci += 1
            out.append(w)
        for c in chunks[ci:]:
            out.extend(c)
        ordered.extend(out)

    words, counters = [], {}
    for i, e in enumerate(ordered, start=1):
        counters[e["pack"]] = counters.get(e["pack"], 0) + 1
        words.append({
            "id": f"{e['pack']}-{counters[e['pack']]:03d}",
            "rank": 500 + i,
            "en": e["en"],
            "pos": e["pos"],
            "fr": e["fr"],
            "frAlt": e["frAlt"],
            "ipa": ipa_of(e["en"]),
            "exampleEn": e["exampleEn"],
            "exampleFr": e["exampleFr"],
            "spellingAlt": us_variants(e["en"]),
            "cefr": e["cefr"],
            "pack": e["pack"],
            "group": e["group"],
            **({"note": e["note"]} if e["note"] else {}),
        })
    meta = {
        "sources": {
            "levels": "CEFR-J Wordlist 1.5 (Tono, TUFS) + Octanove C1/C2 (CC BY-SA 4.0)",
            "frequency": "FrequencyWords 2018, OpenSubtitles (H. Dave, CC BY-SA 4.0)",
            "ipa": "Britfone 3.0.1 (MIT) converti en IPA australienne",
            "content": "traductions, exemples, phrasal verbs, expressions, australianismes et vocabulaire professionnel rédigés pour l'application",
        },
        "counts": {k: len(v) for k, v in packs.items()},
        "count": len(words),
    }
    OUT.write_text(json.dumps({"meta": meta, "words": words}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    missing_ipa = sum(1 for w in words if not w["ipa"])
    print(f"OK : {len(words)} mots -> {OUT.relative_to(ROOT)} · {meta['counts']} · sans IPA : {missing_ipa}")


if __name__ == "__main__":
    main()
