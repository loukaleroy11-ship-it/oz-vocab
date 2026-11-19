/**
 * Fusion « la modification la plus récente gagne », enregistrement par
 * enregistrement (champ updatedAt). Fonction pure, testée.
 */
export interface Stamped {
  id: string;
  updatedAt: number;
}

export interface MergeResult<T extends Stamped> {
  merged: Record<string, T>;
  /** Enregistrements distants plus récents à écrire localement. */
  pullToLocal: T[];
  /** Le document distant doit être réécrit (au moins un enregistrement local plus récent ou absent). */
  remoteNeedsWrite: boolean;
}

export function mergeItems<T extends Stamped>(local: T[], remote: Record<string, T>): MergeResult<T> {
  const merged: Record<string, T> = { ...remote };
  const pullToLocal: T[] = [];
  let remoteNeedsWrite = false;
  const localIds = new Set<string>();
  for (const l of local) {
    localIds.add(l.id);
    const r = remote[l.id];
    if (!r || l.updatedAt > r.updatedAt) {
      merged[l.id] = l;
      remoteNeedsWrite = true;
    } else if (r.updatedAt > l.updatedAt) {
      pullToLocal.push(r);
    }
    // égalité : identiques par construction (même écriture), rien à faire
  }
  for (const [id, r] of Object.entries(remote)) {
    if (!localIds.has(id)) pullToLocal.push(r);
  }
  return { merged, pullToLocal, remoteNeedsWrite };
}
