// Display decoding for combat spells, shared by the /data/spells browser.
// (/play's unit card carries its own copy of the same rules inside its
// client script.) Area-of-effect codes are decoded exactly as the CoE5 5.42
// game prints them (its weapon-description routine): thousands select the
// shape, the rest is the size, and 9xyy is yy bounces with range x. The
// damage-die vs effect split follows the game data's own annotations — see
// DESIGN.md.

const AOE_SHAPES = [
  [1000, "beam"],
  [2000, "narrow cone"],
  [3000, "cone"],
  [4000, "wide cone"],
  [5000, "line"],
  [7000, "crack"],
];

export const aoeText = (aoe) => {
  if (aoe === undefined || aoe === 0) return "single target";
  if (aoe < 0) return `${-aoe} strikes`;
  for (const [base, shape] of AOE_SHAPES) if (aoe >= base && aoe < base + 1000) return `${shape} ${aoe - base}`;
  if (aoe >= 9000 && aoe < 9900) return `${aoe % 100} bounces range ${Math.floor((aoe - 9000) / 100)}`;
  if (aoe === 997) return "circle";
  if (aoe === 998) return "all friends";
  if (aoe === 999) return "all enemies";
  if (aoe === 9997) return "15% of battlefield";
  if (aoe === 9995 || aoe === 9996 || aoe === 9998 || aoe === 9999) return "entire battlefield";
  return `burst ${aoe}`;
};

/** Damage cell: die spells show "Type 1-N", effect spells show "special"
 *  with the effect name as the hover title. */
export const damageText = (spell, rec) => {
  if (spell.dmg !== undefined) {
    return { text: `${rec?.type ? rec.type + " " : ""}1-${spell.dmg}`, title: rec?.type ?? null };
  }
  return { text: "special", title: spell.effect ?? null };
};

/**
 * Targeting flags on a spell's weapon record, with the short label for the
 * Special column and the tag commands the restriction cross-references.
 * Wording follows the manual's weapon-section descriptions; affecthuman is
 * deliberately not mapped to the human tag — the manual says it keys on the
 * res_convert attribute instead.
 */
export const RESTRICTIONS = {
  affectundead: { label: "only undead", tags: ["undead"], relation: "Combat spells that only affect undead" },
  affectanimal: { label: "only animals", tags: ["animal"], relation: "Combat spells that only affect animals" },
  affecthuman: { label: "only res_convert units", tags: [], relation: "" },
  undead: { label: "not undead", tags: ["undead"], relation: "Combat spells that do not affect undead" },
  undkill: { label: "x2 vs undead", tags: ["undead"], relation: "Combat spells with double damage against undead" },
  holykill: { label: "x2 vs undead & demons", tags: ["undead", "demonic"], relation: "Combat spells with double damage against undead and demons" },
  stonekill: { label: "x2 vs stone", tags: ["stonebeing"], relation: "Combat spells with double damage against stone beings" },
  wallkill: { label: "x5 vs walls", tags: ["walls"], relation: "Combat spells with x5 damage against walls" },
  tree: { label: "trees/fungi immune", tags: ["tree", "fungus"], relation: "Combat spells that trees, bushes and fungi are immune to" },
  mundane: { label: "mundane", tags: ["ethereal"], relation: "Combat spells that Ethereal protects against (75% to be unaffected)" },
  drown: { label: "water breathers immune", tags: [], relation: "" },
  reanimate: { label: "victims rise as Soulless", tags: ["undead"], relation: "Combat spells whose victims rise as undead (Soulless)" },
};

export const specialText = (spell, rec) =>
  [
    aoeText(rec?.aoe),
    ...(rec?.flags ?? []).map((f) => RESTRICTIONS[f]?.label).filter(Boolean),
    ...(rec?.an ? ["AN"] : []),
    ...(spell.slowcast ? ["slow cast"] : []),
  ].join(", ");

export const spellAnchor = (pathNbr, name) =>
  `s${pathNbr}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/**
 * All combat spells whose weapon carries a restriction that touches the
 * given tag command — grouped by relation, for the command pages' "Interacts
 * with" section.
 */
export const spellRelationsFor = (tag, spellsByPath, spellPaths, weaponsByIndex) => {
  const byRelation = new Map();
  for (const [pathNbr, list] of Object.entries(spellsByPath)) {
    for (const sp of list) {
      const flags = weaponsByIndex[sp.weapon]?.flags ?? [];
      for (const f of flags) {
        const r = RESTRICTIONS[f];
        if (!r || !r.tags.includes(tag)) continue;
        if (!byRelation.has(r.relation)) byRelation.set(r.relation, []);
        byRelation.get(r.relation).push({
          name: sp.name,
          pathName: spellPaths[pathNbr] ?? `path ${pathNbr}`,
          anchor: spellAnchor(pathNbr, sp.name),
        });
      }
    }
  }
  return [...byRelation].map(([relation, spells]) => ({
    relation,
    spells: spells.sort((a, b) => a.name.localeCompare(b.name)),
  }));
};
