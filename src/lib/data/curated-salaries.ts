/**
 * Curated annual base salaries for high-profile WC 2026 players.
 *
 * All figures are GROSS BASE SALARY normalized to EUR. We use base salary
 * rather than Forbes "total earnings" so the numbers reflect what the club
 * actually pays, not endorsements / image rights.
 *
 * Sources (verified June 2026):
 *   - Capology 2025-26 club salary tables
 *   - Spotrac (Premier League)
 *   - Goal.com / Tribuna / FootballFancast
 *
 * Conversion: GBP × 1.176 → EUR, USD × 0.926 → EUR.
 *
 * Matching: each row provides `lastname` (case/accent-insensitive substring
 * match against api-football's `lastname` field) and `nationality` (which
 * must match the squad team name). This avoids the false-positive case where
 * two players share a surname (e.g. there are multiple "Silva"s in the WC).
 */

export interface CuratedSalary {
  /** Display name — for reference and debugging. */
  display: string
  /** Lowercased, accent-stripped surname fragment for matching. */
  lastname: string
  /** Optional firstname hint — used to disambiguate within a team. */
  firstnameHint?: string
  /** Team name as it appears in fixtures (e.g. "Brazil", "England"). */
  nationality: string
  /** Gross base salary in EUR (annual). */
  annualEur: number
  /** Where the number came from. */
  source: string
}

export const curatedSalaries: CuratedSalary[] = [
  // ── Portugal ──────────────────────────────────────────────
  { display: 'Cristiano Ronaldo', lastname: 'ronaldo', firstnameHint: 'cristiano', nationality: 'Portugal', annualEur: 200_000_000, source: 'Capology 2025-26' },
  { display: 'Bruno Fernandes', lastname: 'fernandes', firstnameHint: 'bruno', nationality: 'Portugal', annualEur: 18_300_000, source: 'Spotrac 2025-26 (£15.6M)' },
  { display: 'Bernardo Silva', lastname: 'silva', firstnameHint: 'bernardo', nationality: 'Portugal', annualEur: 15_000_000, source: 'Capology 2025-26' },
  { display: 'Rúben Dias', lastname: 'dias', firstnameHint: 'ruben', nationality: 'Portugal', annualEur: 11_800_000, source: 'Spotrac 2025-26' },
  { display: 'João Félix', lastname: 'felix', firstnameHint: 'joao', nationality: 'Portugal', annualEur: 8_000_000, source: 'Capology 2025-26' },
  { display: 'Diogo Jota', lastname: 'jota', firstnameHint: 'diogo', nationality: 'Portugal', annualEur: 8_500_000, source: 'Spotrac 2025-26' },
  { display: 'Rafael Leão', lastname: 'leao', firstnameHint: 'rafael', nationality: 'Portugal', annualEur: 7_000_000, source: 'Capology 2025-26' },

  // ── France ────────────────────────────────────────────────
  { display: 'Kylian Mbappé', lastname: 'mbappe', firstnameHint: 'kylian', nationality: 'France', annualEur: 31_250_000, source: 'Capology 2025-26' },
  { display: 'Antoine Griezmann', lastname: 'griezmann', nationality: 'France', annualEur: 15_000_000, source: 'Capology 2025-26' },
  { display: "N'Golo Kanté", lastname: 'kante', nationality: 'France', annualEur: 25_000_000, source: 'Capology Saudi 2025-26' },
  { display: 'Aurélien Tchouaméni', lastname: 'tchouameni', nationality: 'France', annualEur: 7_500_000, source: 'Capology 2025-26' },
  { display: 'Eduardo Camavinga', lastname: 'camavinga', nationality: 'France', annualEur: 6_000_000, source: 'Capology 2025-26' },
  { display: 'Kingsley Coman', lastname: 'coman', firstnameHint: 'kingsley', nationality: 'France', annualEur: 15_000_000, source: 'Capology 2025-26' },
  { display: 'Ousmane Dembélé', lastname: 'dembele', firstnameHint: 'ousmane', nationality: 'France', annualEur: 15_000_000, source: 'Capology 2025-26' },
  { display: 'Adrien Rabiot', lastname: 'rabiot', nationality: 'France', annualEur: 6_500_000, source: 'Capology 2025-26' },
  { display: 'Mike Maignan', lastname: 'maignan', nationality: 'France', annualEur: 4_000_000, source: 'Capology 2025-26' },
  { display: 'Bradley Barcola', lastname: 'barcola', nationality: 'France', annualEur: 3_500_000, source: 'Capology 2025-26' },

  // ── Spain ─────────────────────────────────────────────────
  { display: 'Rodri', lastname: 'rodri', firstnameHint: 'rodrigo', nationality: 'Spain', annualEur: 13_450_000, source: 'Spotrac 2025-26 (£11.44M)' },
  { display: 'Pedri', lastname: 'pedri', nationality: 'Spain', annualEur: 12_500_000, source: 'Capology 2025-26' },
  { display: 'Lamine Yamal', lastname: 'yamal', nationality: 'Spain', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Gavi', lastname: 'gavi', nationality: 'Spain', annualEur: 6_000_000, source: 'Capology 2025-26' },
  { display: 'Dani Carvajal', lastname: 'carvajal', nationality: 'Spain', annualEur: 8_000_000, source: 'Capology 2025-26' },
  { display: 'Álvaro Morata', lastname: 'morata', nationality: 'Spain', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Nico Williams', lastname: 'williams', firstnameHint: 'nico', nationality: 'Spain', annualEur: 6_000_000, source: 'Capology 2025-26' },

  // ── Brazil ────────────────────────────────────────────────
  { display: 'Vinícius Júnior', lastname: 'junior', firstnameHint: 'vinicius', nationality: 'Brazil', annualEur: 25_000_000, source: 'Capology 2025-26' },
  { display: 'Rodrygo', lastname: 'rodrygo', nationality: 'Brazil', annualEur: 8_000_000, source: 'Capology 2025-26' },
  { display: 'Casemiro', lastname: 'casemiro', nationality: 'Brazil', annualEur: 16_000_000, source: 'Spotrac 2025-26' },
  { display: 'Marquinhos', lastname: 'marquinhos', nationality: 'Brazil', annualEur: 11_000_000, source: 'Capology 2025-26' },
  { display: 'Alisson Becker', lastname: 'becker', firstnameHint: 'alisson', nationality: 'Brazil', annualEur: 11_500_000, source: 'Spotrac 2025-26' },
  { display: 'Ederson', lastname: 'ederson', nationality: 'Brazil', annualEur: 8_000_000, source: 'Spotrac 2025-26' },
  { display: 'Bruno Guimarães', lastname: 'guimaraes', firstnameHint: 'bruno', nationality: 'Brazil', annualEur: 7_300_000, source: 'Spotrac 2025-26' },
  { display: 'Raphinha', lastname: 'raphinha', nationality: 'Brazil', annualEur: 9_000_000, source: 'Capology 2025-26' },
  { display: 'Lucas Paquetá', lastname: 'paqueta', nationality: 'Brazil', annualEur: 10_500_000, source: 'Spotrac 2025-26' },
  { display: 'Richarlison', lastname: 'richarlison', nationality: 'Brazil', annualEur: 8_300_000, source: 'Spotrac 2025-26' },
  { display: 'Endrick', lastname: 'endrick', nationality: 'Brazil', annualEur: 4_000_000, source: 'Capology 2025-26' },
  { display: 'Éder Militão', lastname: 'militao', nationality: 'Brazil', annualEur: 10_000_000, source: 'Capology 2025-26' },
  { display: 'Gabriel Magalhães', lastname: 'magalhaes', firstnameHint: 'gabriel', nationality: 'Brazil', annualEur: 8_000_000, source: 'Spotrac 2025-26' },
  { display: 'Gabriel Martinelli', lastname: 'martinelli', nationality: 'Brazil', annualEur: 5_500_000, source: 'Spotrac 2025-26' },
  { display: 'Antony', lastname: 'antony', nationality: 'Brazil', annualEur: 11_750_000, source: 'Spotrac 2025-26' },

  // ── Argentina ─────────────────────────────────────────────
  { display: 'Lionel Messi', lastname: 'messi', nationality: 'Argentina', annualEur: 26_000_000, source: 'MLSPA 2025 ($28.3M)' },
  { display: 'Lautaro Martínez', lastname: 'martinez', firstnameHint: 'lautaro', nationality: 'Argentina', annualEur: 6_500_000, source: 'Capology 2025-26' },
  { display: 'Julián Álvarez', lastname: 'alvarez', firstnameHint: 'julian', nationality: 'Argentina', annualEur: 5_500_000, source: 'Capology 2025-26' },
  { display: 'Rodrigo De Paul', lastname: 'paul', nationality: 'Argentina', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Paulo Dybala', lastname: 'dybala', nationality: 'Argentina', annualEur: 7_000_000, source: 'Capology 2025-26' },
  { display: 'Emiliano Martínez', lastname: 'martinez', firstnameHint: 'emiliano', nationality: 'Argentina', annualEur: 5_200_000, source: 'Spotrac 2025-26' },

  // ── Germany ───────────────────────────────────────────────
  { display: 'Manuel Neuer', lastname: 'neuer', nationality: 'Germany', annualEur: 26_250_000, source: 'Capology 2025-26' },
  { display: 'Joshua Kimmich', lastname: 'kimmich', nationality: 'Germany', annualEur: 20_000_000, source: 'Capology 2025-26' },
  { display: 'Antonio Rüdiger', lastname: 'rudiger', nationality: 'Germany', annualEur: 10_000_000, source: 'Capology 2025-26' },
  { display: 'Florian Wirtz', lastname: 'wirtz', nationality: 'Germany', annualEur: 12_000_000, source: 'Spotrac 2025-26' },
  { display: 'Kai Havertz', lastname: 'havertz', nationality: 'Germany', annualEur: 11_000_000, source: 'Spotrac 2025-26' },
  { display: 'Leroy Sané', lastname: 'sane', firstnameHint: 'leroy', nationality: 'Germany', annualEur: 14_000_000, source: 'Capology 2025-26' },
  { display: 'Jamal Musiala', lastname: 'musiala', nationality: 'Germany', annualEur: 15_000_000, source: 'Capology 2025-26' },
  { display: 'İlkay Gündoğan', lastname: 'gundogan', nationality: 'Germany', annualEur: 10_000_000, source: 'Capology 2025-26' },

  // ── England ───────────────────────────────────────────────
  { display: 'Harry Kane', lastname: 'kane', firstnameHint: 'harry', nationality: 'England', annualEur: 25_000_000, source: 'Capology 2025-26' },
  { display: 'Jude Bellingham', lastname: 'bellingham', firstnameHint: 'jude', nationality: 'England', annualEur: 18_000_000, source: 'Capology 2025-26' },
  { display: 'Bukayo Saka', lastname: 'saka', nationality: 'England', annualEur: 12_900_000, source: 'Spotrac 2025-26 (£11M)' },
  { display: 'Phil Foden', lastname: 'foden', nationality: 'England', annualEur: 13_500_000, source: 'Spotrac 2025-26' },
  { display: 'Cole Palmer', lastname: 'palmer', firstnameHint: 'cole', nationality: 'England', annualEur: 9_400_000, source: 'Spotrac 2025-26 (£8M)' },
  { display: 'Declan Rice', lastname: 'rice', nationality: 'England', annualEur: 14_100_000, source: 'Spotrac 2025-26 (£12M)' },
  { display: 'Marcus Rashford', lastname: 'rashford', nationality: 'England', annualEur: 17_600_000, source: 'Spotrac 2025-26 (£15M)' },
  { display: 'Trent Alexander-Arnold', lastname: 'alexander-arnold', nationality: 'England', annualEur: 11_800_000, source: 'Capology 2025-26' },

  // ── Norway ────────────────────────────────────────────────
  { display: 'Erling Haaland', lastname: 'haaland', nationality: 'Norway', annualEur: 32_100_000, source: 'Capology 2025-26 (£27.3M)' },
  { display: 'Martin Ødegaard', lastname: 'odegaard', nationality: 'Norway', annualEur: 7_100_000, source: 'Spotrac 2025-26' },

  // ── Netherlands ───────────────────────────────────────────
  { display: 'Virgil van Dijk', lastname: 'dijk', nationality: 'Netherlands', annualEur: 12_900_000, source: 'Spotrac 2025-26 (£11M)' },
  { display: 'Frenkie de Jong', lastname: 'jong', firstnameHint: 'frenkie', nationality: 'Netherlands', annualEur: 19_000_000, source: 'Capology 2025-26' },
  { display: 'Memphis Depay', lastname: 'depay', nationality: 'Netherlands', annualEur: 5_500_000, source: 'Capology 2025-26' },
  { display: 'Cody Gakpo', lastname: 'gakpo', nationality: 'Netherlands', annualEur: 5_900_000, source: 'Spotrac 2025-26' },
  { display: 'Matthijs de Ligt', lastname: 'ligt', nationality: 'Netherlands', annualEur: 11_800_000, source: 'Spotrac 2025-26' },

  // ── Belgium ───────────────────────────────────────────────
  { display: 'Kevin De Bruyne', lastname: 'bruyne', firstnameHint: 'kevin', nationality: 'Belgium', annualEur: 18_000_000, source: 'Capology 2025-26 (Napoli)' },
  { display: 'Romelu Lukaku', lastname: 'lukaku', nationality: 'Belgium', annualEur: 9_000_000, source: 'Capology 2025-26' },
  { display: 'Thibaut Courtois', lastname: 'courtois', nationality: 'Belgium', annualEur: 15_000_000, source: 'Capology 2025-26' },
  { display: 'Jeremy Doku', lastname: 'doku', nationality: 'Belgium', annualEur: 4_700_000, source: 'Spotrac 2025-26' },

  // ── Italy ─────────────────────────────────────────────────
  { display: 'Federico Chiesa', lastname: 'chiesa', nationality: 'Italy', annualEur: 7_000_000, source: 'Spotrac 2025-26' },
  { display: 'Gianluigi Donnarumma', lastname: 'donnarumma', nationality: 'Italy', annualEur: 12_000_000, source: 'Capology 2025-26' },
  { display: 'Nicolò Barella', lastname: 'barella', nationality: 'Italy', annualEur: 6_500_000, source: 'Capology 2025-26' },

  // ── Croatia ───────────────────────────────────────────────
  { display: 'Luka Modrić', lastname: 'modric', nationality: 'Croatia', annualEur: 10_000_000, source: 'Capology 2025-26' },
  { display: 'Mateo Kovačić', lastname: 'kovacic', nationality: 'Croatia', annualEur: 11_800_000, source: 'Spotrac 2025-26' },

  // ── Morocco ───────────────────────────────────────────────
  { display: 'Achraf Hakimi', lastname: 'hakimi', nationality: 'Morocco', annualEur: 13_640_000, source: 'Capology 2025-26' },
  { display: 'Hakim Ziyech', lastname: 'ziyech', nationality: 'Morocco', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Sofyan Amrabat', lastname: 'amrabat', nationality: 'Morocco', annualEur: 4_500_000, source: 'Capology 2025-26' },
  { display: 'Youssef En-Nesyri', lastname: 'nesyri', nationality: 'Morocco', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Yassine Bounou', lastname: 'bounou', nationality: 'Morocco', annualEur: 4_000_000, source: 'Capology 2025-26' },
  { display: 'Noussair Mazraoui', lastname: 'mazraoui', nationality: 'Morocco', annualEur: 4_700_000, source: 'Spotrac 2025-26' },

  // ── Mexico ────────────────────────────────────────────────
  { display: 'Hirving Lozano', lastname: 'lozano', firstnameHint: 'hirving', nationality: 'Mexico', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Edson Álvarez', lastname: 'alvarez', firstnameHint: 'edson', nationality: 'Mexico', annualEur: 4_700_000, source: 'Spotrac 2025-26' },
  { display: 'Raúl Jiménez', lastname: 'jimenez', firstnameHint: 'raul', nationality: 'Mexico', annualEur: 4_700_000, source: 'Spotrac 2025-26' },
  { display: 'Guillermo Ochoa', lastname: 'ochoa', firstnameHint: 'guillermo', nationality: 'Mexico', annualEur: 500_000, source: 'Capology 2025-26 (AEL)' },
  { display: 'Santiago Giménez', lastname: 'gimenez', firstnameHint: 'santiago', nationality: 'Mexico', annualEur: 4_000_000, source: 'Capology 2025-26' },

  // ── USA ───────────────────────────────────────────────────
  { display: 'Christian Pulisic', lastname: 'pulisic', nationality: 'USA', annualEur: 6_000_000, source: 'Capology 2025-26 (Milan)' },
  { display: 'Weston McKennie', lastname: 'mckennie', nationality: 'USA', annualEur: 4_000_000, source: 'Capology 2025-26' },
  { display: 'Tyler Adams', lastname: 'adams', firstnameHint: 'tyler', nationality: 'USA', annualEur: 4_700_000, source: 'Spotrac 2025-26' },
  { display: 'Giovanni Reyna', lastname: 'reyna', nationality: 'USA', annualEur: 5_000_000, source: 'Capology 2025-26' },
  { display: 'Folarin Balogun', lastname: 'balogun', nationality: 'USA', annualEur: 4_500_000, source: 'Capology 2025-26' },
  { display: 'Timothy Weah', lastname: 'weah', nationality: 'USA', annualEur: 3_000_000, source: 'Capology 2025-26' },

  // ── Canada ────────────────────────────────────────────────
  { display: 'Alphonso Davies', lastname: 'davies', firstnameHint: 'alphonso', nationality: 'Canada', annualEur: 13_000_000, source: 'Capology 2025-26' },
  { display: 'Jonathan David', lastname: 'david', firstnameHint: 'jonathan', nationality: 'Canada', annualEur: 6_500_000, source: 'Capology 2025-26' },

  // ── Switzerland ───────────────────────────────────────────
  { display: 'Granit Xhaka', lastname: 'xhaka', nationality: 'Switzerland', annualEur: 6_500_000, source: 'Capology 2025-26' },
  { display: 'Yann Sommer', lastname: 'sommer', nationality: 'Switzerland', annualEur: 4_500_000, source: 'Capology 2025-26' },
  { display: 'Manuel Akanji', lastname: 'akanji', nationality: 'Switzerland', annualEur: 7_100_000, source: 'Spotrac 2025-26 (£6M)' },

  // ── Türkiye ───────────────────────────────────────────────
  { display: 'Arda Güler', lastname: 'guler', nationality: 'Türkiye', annualEur: 4_000_000, source: 'Capology 2025-26' },
  { display: 'Hakan Çalhanoğlu', lastname: 'calhanoglu', nationality: 'Türkiye', annualEur: 6_500_000, source: 'Capology 2025-26' },
  { display: 'Kenan Yıldız', lastname: 'yildiz', nationality: 'Türkiye', annualEur: 3_500_000, source: 'Capology 2025-26' },
]
