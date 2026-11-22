// =====================================================================
//  GAME SETTINGS  –  you can safely change the numbers / words below.
//  After saving this file, reload the game page in the browser.
//  Only change the value AFTER the colon ( : ), keep the comma at the end.
// =====================================================================

export const SETTINGS = {
  // ---- Quiz at each locked door ----
  QUESTIONS_PER_QUIZ: 5,      // how many questions at each door (e.g. 5 or 10)
  CORRECT_TO_UNLOCK: 4,       // how many must be right to open the door (e.g. 4 or 7)

  // ---- Praise with the child's name (only when the child gave a name) ----
  NAME_PRAISE_CHANCE: 0.33,   // share of right answers that use the name (every 3rd right in a row always does)
  NAME_HINT_CHANCE: 0.3,      // share of first wrong tries that say "never mind, <name>"

  // ---- Rewards ----
  // Each subject has a level. How much of a round is easy / hard at levels 1, 2 and 3 (the rest is medium).
  LEVEL_MIX: [{ easy: 0.4, hard: 0 }, { easy: 0.2, hard: 0.2 }, { easy: 0, hard: 0.4 }],
  LEVEL_UP_SCORE: 0.8,        // this share of a round right moves the subject up a level
  LEVEL_DOWN_SCORE: 0.4,      // this share or less moves it down a level

  COINS_PER_CORRECT: 10,      // coins for each answer right on the first try
  COINS_FOR_UNLOCK: 30,       // bonus coins when a door opens
  XP_PER_CORRECT: 10,         // experience points per right answer
  XP_PER_LEVEL: 100,          // XP needed to go up one level

  // ---- Surprises inside open rooms ----
  BONUS_QUESTIONS: 3,         // questions to answer for a new surprise (one surprise per room per day is free)
  BONUS_CORRECT: 2,           // how many must be right
  SURPRISE_SECONDS: 15,       // how long chocolate rain / balloon games last
  KITTEN_SECONDS: 40,         // time to find the hidden kitten

  // ---- Terrace upstairs (kite, stars, pool, secret attic) ----
  KITE_QUESTIONS: 5,          // questions to fly the kite (each right answer lifts it higher)
  KITE_CORRECT: 3,            // right answers needed for a golden key
  STAR_QUESTIONS: 5,          // questions at the telescope (each right answer lights up stars)
  STAR_CORRECT: 3,            // right answers needed for a golden key
  JACKET_QUESTIONS: 3,        // questions for the lifeguard's life jacket (once a day)
  JACKET_CORRECT: 2,          // how many must be right
  RESCUE_QUESTIONS: 5,        // right answers needed to help the friend out of the pool
  TERRACE_COINS: 20,          // coins for passing the kite or star round
  RESCUE_COINS: 30,           // coins for helping the friend out
  ATTIC_QUESTIONS: 10,        // bonus level questions in the secret attic (harder ones first)
  ATTIC_CORRECT: 7,           // how many must be right
  ATTIC_FIRST_COINS: 100,     // coins the first time the attic opens
  ATTIC_COINS: 40,            // coins for each later bonus level won

  // ---- Daily bonus ----
  FOREST_QUESTIONS: 5,        // questions at each board on the forest path (Science)
  SPACE_PART_QUESTIONS: 5,    // questions for each of the 4 rocket parts
  SPACE_PART_CORRECT: 3,
  SPACE_FLAG_QUESTIONS: 3,    // questions to plant the flag on the Moon
  SPACE_FLAG_CORRECT: 2,
  SPACE_COINS: 40,            // coins for coming home from the Moon
  ROCK_COINS: 2,              // coins for each Moon rock picked up
  RACE_QUESTIONS: 10,         // questions in one boat race (one per leg of the race)
  RACE_COINS: [30, 20, 12, 6],   // coins for coming 1st, 2nd, 3rd, 4th
  PARK_QUESTIONS: 5,          // maths questions before each ride in the Maths Park
  PARK_CORRECT: 3,            // how many must be right to get on the ride
  FOREST_CORRECT: 3,          // how many must be right to open the next gate
  FOREST_GATE_COINS: 20,      // coins for each gate
  TREE_QUESTIONS: 3,          // harder questions for each branch of the big tree
  TREE_CORRECT: 2,            // how many must be right to climb up
  TREE_COINS: 100,            // coins for reaching the top of the tree
  FRUIT_COINS: 2,             // coins for each fruit eaten

  DAILY_BONUS: 10,            // coins for playing today; multiplied by the streak (max 7 days)

  // ---- Language ----
  DEFAULT_LANGUAGE: "ml",     // "ml" = Malayalam medium, "en" = English medium

  // ---- Which questions to show ----
  SHOW_UNREVIEWED: true,      // true = also show questions marked "reviewed": false
  SHOW_NEEDS_REVIEW: false,   // false = hide questions marked "needsReview": true
  SHUFFLE_OPTIONS: true,      // true = mix up the order of A/B/C/D each time

  // ---- Thanks to question sources ----
  MORE_TESTS_LINK_EVERY: 4,   // after every 4th round with Bio-vision questions, show a link to their mock tests (0 = never)

  // ---- Walking ----
  WALK_SPEED: 3.4,            // how fast the child walks
};
