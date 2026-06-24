/* ===========================================================================
   Starfall Academy — Sheet Search
   Indexes all searchable content and provides matching + navigation logic.
   =========================================================================== */

window.SF_SEARCH = (() => {
  /**
   * Build a searchable index from all sheet data.
   * Returns array of { id, type, name, category, data, section }.
   */
  function buildIndex(ctx) {
    const results = [];
    const { stats, schools, spells, moves, artifacts, potions, recipes, plants, items, glyphs, wands, conditions, classState, classes, locations, bonuses } = ctx;

    // ---- Stats (rollable) ----
    (stats || []).forEach((stat) => {
      results.push({
        id: `stat-${stat.id}`,
        type: "stat",
        name: stat.name,
        category: "Stat",
        data: stat,
        section: "stats",
        rollable: true,
      });

      // Skills under each stat (rollable)
      (stat.skills || []).forEach((skill) => {
        results.push({
          id: `skill-${stat.id}-${skill.id}`,
          type: "skill",
          name: skill.name,
          category: "Skill",
          data: { stat, skill },
          section: "stats",
          rollable: true,
          parent: stat.name,
        });
      });
    });

    // ---- Magic schools & subjects (rollable) ----
    (schools || []).forEach((school) => {
      (school.subjects || []).forEach((subject) => {
        results.push({
          id: `subject-${subject.key}`,
          type: "subject",
          name: subject.name,
          category: "Subject",
          data: { school, subject },
          section: "magic",
          rollable: true,
        });
      });
    });

    // ---- Spells (rollable) ----
    (spells || []).forEach((spell) => {
      results.push({
        id: `spell-${spell.id}`,
        type: "spell",
        name: spell.name,
        category: "Spell",
        data: spell,
        section: "magic",
        rollable: true,
      });
    });

    // ---- Moves (rollable) ----
    (moves || []).forEach((move) => {
      results.push({
        id: `move-${move.id}`,
        type: "move",
        name: move.name,
        category: "Move",
        data: move,
        section: "overview",
        rollable: true,
      });
    });

    // ---- Artifacts (repair rolls if damaged/broken, attune if not attuned) ----
    (artifacts || []).forEach((artifact) => {
      results.push({
        id: `artifact-${artifact.id}`,
        type: "artifact",
        name: artifact.name,
        category: "Artifact",
        data: artifact,
        section: "inventory",
        rollable: !artifact.attuned,
        repairButton: artifact.condition !== "stable",
      });
    });

    // ---- Potions (rollable) ----
    (potions || []).forEach((potion) => {
      results.push({
        id: `potion-${potion.id}`,
        type: "potion",
        name: potion.name,
        category: "Potion",
        data: potion,
        section: "inventory",
        rollable: true,
      });
    });

    // ---- Potion recipes (rollable) ----
    (recipes || []).forEach((recipe) => {
      results.push({
        id: `recipe-${recipe.id}`,
        type: "recipe",
        name: recipe.name,
        category: "Recipe",
        data: recipe,
        section: "inventory",
        rollable: true,
      });
    });

    // ---- Plants (rollable or use button) ----
    (plants || []).forEach((plant) => {
      const requiresRollUpper = (plant.requiresRoll || "").toUpperCase();
      const isNoRoll = requiresRollUpper === "NO";
      results.push({
        id: `plant-${plant.id}`,
        type: "plant",
        name: plant.name,
        category: "Plant",
        data: plant,
        section: "inventory",
        rollable: !isNoRoll,
        useButton: isNoRoll,
      });
    });

    // ---- Items (rollable or use button) ----
    (items || []).forEach((item) => {
      results.push({
        id: `item-${item.id}`,
        type: "item",
        name: item.name,
        category: "Item",
        data: item,
        section: "inventory",
        rollable: !!item.check,
        useButton: !item.check,
      });
    });

    // ---- Glyphs (not rollable by default, but included) ----
    (glyphs || []).forEach((glyph) => {
      results.push({
        id: `glyph-${glyph.id}`,
        type: "glyph",
        name: glyph.name,
        category: "Glyph",
        data: glyph,
        section: "inventory",
        rollable: false,
      });
    });

    // ---- Wands (not directly rollable, but useful) ----
    (wands || []).forEach((wand) => {
      results.push({
        id: `wand-${wand.id}`,
        type: "wand",
        name: wand.name,
        category: "Wand",
        data: wand,
        section: "inventory",
        wandcraftButton: wand.condition < wand.maxCondition || !!wand.crafting,
      });
    });

    // ---- Conditions (shows current stacks, not rollable directly) ----
    (conditions || []).forEach((condition) => {
      results.push({
        id: `condition-${condition.id}`,
        type: "condition",
        name: condition.name,
        category: "Condition",
        data: condition,
        section: "overview",
        rollable: false,
        showStacks: true,
      });
    });

    // ---- Classes & class rank abilities (not rollable) ----
    (classes || []).forEach((classEntry) => {
      const rank = (classState && classState[classEntry.id]) ? classState[classEntry.id].rank : 0;
      if (rank > 0) {
        results.push({
          id: `class-${classEntry.id}`,
          type: "class",
          name: classEntry.name,
          category: "Class",
          data: { classEntry, rank },
          section: "classes",
          rollable: false,
          showRank: rank,
        });

        // Class rank abilities
        for (let L = 1; L <= rank; L++) {
          const rung = classEntry.ranks[L - 1];
          if (rung && rung.options) {
            const chosenSide = classState[classEntry.id].choices ? classState[classEntry.id].choices[L] : null;
            if (chosenSide !== null && rung.options[chosenSide]) {
              const opt = rung.options[chosenSide];
              results.push({
                id: `class-ability-${classEntry.id}-${L}-${chosenSide}`,
                type: "class-ability",
                name: opt.title || opt.name,
                category: "Class Ability",
                data: { classEntry, rung, opt, rankLevel: L, side: chosenSide },
                section: "classes",
                rollable: false,
                parent: classEntry.name,
              });
            }
          }
        }
      }
    });

    // ---- Bonuses (passive, not directly rollable) ----
    (bonuses || []).forEach((b) => {
      if (!b || !b.source) return;
      results.push({
        id: `bonus-${b.id}`,
        type: "bonus",
        name: b.source,
        category: "Bonus",
        data: b,
        section: "overview",
        rollable: false,
      });
    });

    // ---- Map locations (not rollable) ----
    if (locations && Array.isArray(locations)) {
      locations.forEach((region) => {
        // Add the region itself
        results.push({
          id: `location-region-${region.id}`,
          type: "location",
          name: region.name,
          category: "Map Location",
          data: region,
          section: "map",
          rollable: false,
        });

        const submap = region.submap;
        if (!submap) return;

        if (submap.seeds && Array.isArray(submap.seeds)) {
          // Starfall Citadel: districts are in seeds[]
          submap.seeds.forEach((seed) => {
            if (!seed.name) return;
            results.push({
              id: `location-seed-${region.id}-${seed.name}`,
              type: "location",
              name: seed.name,
              category: "Map Location",
              data: { ...seed, parentRegion: region.name },
              section: "map",
              rollable: false,
              parent: region.name,
            });
            // Named places within each district
            if (seed.subs && Array.isArray(seed.subs)) {
              seed.subs.forEach((place) => {
                results.push({
                  id: `location-place-${region.id}-${seed.name}-${place.name}`,
                  type: "location",
                  name: place.name,
                  category: "Map Location",
                  data: { ...place, parentRegion: region.name, parentDistrict: seed.name },
                  section: "map",
                  rollable: false,
                  parent: seed.name,
                });
              });
            }
          });
        } else if (submap.subs && Array.isArray(submap.subs)) {
          // Regular regions: sub-locations directly in submap.subs
          submap.subs.forEach((sub) => {
            results.push({
              id: `location-sub-${region.id}-${sub.name}`,
              type: "location",
              name: sub.name,
              category: "Map Location",
              data: { ...sub, parentRegion: region.name, parentRegionId: region.id },
              section: "map",
              rollable: false,
              parent: region.name,
            });
          });
        }
      });
    }

    // ---- Resist rolls (rollable) ----
    (conditions || []).forEach((condition) => {
      results.push({
        id: `resist-${condition.id}`,
        type: "resist",
        name: `Resist ${condition.name}`,
        category: "Resist Roll",
        data: condition,
        section: "overview",
        rollable: true,
      });
    });

    return results;
  }

  /**
   * Search the index for a given query string.
   * Returns results sorted by relevance.
   */
  function search(query, index) {
    if (!query || query.trim().length === 0) return [];

    const q = query.toLowerCase().trim();
    const matches = [];

    index.forEach((entry) => {
      const name = entry.name.toLowerCase();
      const parent = (entry.parent || "").toLowerCase();

      // Exact match (best)
      if (name === q) {
        matches.push({ ...entry, relevance: 100 });
      }
      // Starts with (very good)
      else if (name.startsWith(q)) {
        matches.push({ ...entry, relevance: 50 });
      }
      // Contains (good)
      else if (name.includes(q)) {
        matches.push({ ...entry, relevance: 25 });
      }
      // Parent match (ok for child items)
      else if (entry.parent && parent.includes(q)) {
        matches.push({ ...entry, relevance: 10 });
      }
    });

    // Sort by relevance, then by type order, then by name
    const typeOrder = {
      stat: 1,
      skill: 2,
      subject: 3,
      spell: 4,
      move: 5,
      artifact: 6,
      potion: 7,
      recipe: 8,
      plant: 9,
      item: 10,
      glyph: 11,
      wand: 12,
      condition: 13,
      resist: 14,
      class: 15,
      "class-ability": 16,
      location: 17,
    };

    matches.sort((a, b) => {
      if (a.relevance !== b.relevance) return b.relevance - a.relevance;
      const typeA = typeOrder[a.type] || 999;
      const typeB = typeOrder[b.type] || 999;
      if (typeA !== typeB) return typeA - typeB;
      return a.name.localeCompare(b.name);
    });

    return matches.slice(0, 20); // Limit to top 20 results
  }

  return {
    buildIndex,
    search,
  };
})();
