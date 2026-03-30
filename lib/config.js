import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_CONFIG = {
  tag: { prefix: "v" },
  changelog: { emojis: false },

  releaseRules: {
    feat: "minor",
    fix: "patch"
  }
};

const VALID_BUMPS = ["major", "minor", "patch", "none"];
const LOCKED_TYPES = ["feat", "fix"];

/**
 * Validate and normalize a mapping of commit types to release bump rules.
 *
 * The function:
 * - Normalizes commit type keys to lowercase.
 * - Skips any types present in the external LOCKED_TYPES array and emits a console.warn for each skipped type.
 * - Validates each bump value against the external VALID_BUMPS array and throws an Error for invalid bumps.
 * - Returns a new object containing only validated, non-locked mappings.
 *
 * @param {Object<string, string>} [rules={}] - An object mapping commit types to bump types (e.g. { feat: 'minor', fix: 'patch' }).
 * @returns {Object<string, string>} A new object with lowercase commit type keys and validated bump values.
 * @throws {Error} If a provided bump value is not included in VALID_BUMPS.
 *
 * @example
 * // Assuming VALID_BUMPS = ['major','minor','patch'] and LOCKED_TYPES = ['chore']
 * validateReleaseRules({ Feat: 'minor', docs: 'patch', Chore: 'major' })
 * // => { feat: 'minor', docs: 'patch' } // 'Chore' ignored and console.warn emitted
 *
 * @remarks
 * - This function has the side effect of logging warnings to the console for locked types.
 * - It relies on the presence of LOCKED_TYPES and VALID_BUMPS in the surrounding scope.
 */
function validateReleaseRules(rules = {}) {
  const safeRules = {};

  for (const [type, bump] of Object.entries(rules)) {
    const normalizedType = type.toLowerCase();

    if (LOCKED_TYPES.includes(normalizedType)) {
      console.warn(
        `[release-config] Override ignored for "${normalizedType}". This type is locked.`
      );
      continue;
    }

    if (!VALID_BUMPS.includes(bump)) {
      throw new Error(`Invalid bump type "${bump}" for commit type "${type}"`);
    }

    safeRules[normalizedType] = bump;
  }

  return safeRules;
}

/**
 * Normalize a partial user configuration into a complete runtime configuration.
 *
 * Missing or invalid values from the provided userConfig are replaced with
 * defaults from DEFAULT_CONFIG. The function performs the following normalizations:
 * - tag.prefix: must be a string; otherwise DEFAULT_CONFIG.tag.prefix is used.
 * - changelog.emojis: must be a boolean; otherwise DEFAULT_CONFIG.changelog.emojis is used.
 * - releaseRules: DEFAULT_CONFIG.releaseRules are merged with the result of
 *   validateReleaseRules(userConfig?.releaseRules).
 *
 * @param {Object} [userConfig={}] - Partial configuration provided by the user.
 * @param {Object} [userConfig.tag] - Tag-related settings.
 * @param {string} [userConfig.tag.prefix] - Tag prefix; if not a string the default is used.
 * @param {Object} [userConfig.changelog] - Changelog-related settings.
 * @param {boolean} [userConfig.changelog.emojis] - Whether to include emojis in the changelog; if not boolean the default is used.
 * @param {*} [userConfig.releaseRules] - Release rules passed to validateReleaseRules; see validateReleaseRules for the expected shape.
 *
 * @returns {{ tag: { prefix: string }, changelog: { emojis: boolean }, releaseRules: * }}
 *   The normalized configuration object with guaranteed shapes for tag and changelog,
 *   and merged releaseRules.
 *
 * @throws {*} Propagates any error thrown by validateReleaseRules when provided releaseRules are invalid.
 */
function normalizeConfig(userConfig = {}) {
  return {
    tag: {
      prefix:
        typeof userConfig?.tag?.prefix === "string"
          ? userConfig.tag.prefix
          : DEFAULT_CONFIG.tag.prefix
    },

    changelog: {
      emojis:
        typeof userConfig?.changelog?.emojis === "boolean"
          ? userConfig.changelog.emojis
          : DEFAULT_CONFIG.changelog.emojis
    },

    releaseRules: {
      ...DEFAULT_CONFIG.releaseRules,
      ...validateReleaseRules(userConfig?.releaseRules)
    }
  };
}

/**
 * Asynchronously loads and returns a normalized release configuration from a
 * release.config.js file located in the given working directory.
 *
 * Behavior:
 * - Resolves "release.config.js" inside the provided cwd (defaults to process.cwd()).
 * - If the file does not exist, returns the result of normalizeConfig() (the default config).
 * - If the file exists, dynamically imports it via a file:// URL and accepts either
 *   an ES module default export or a CommonJS export (uses mod.default ?? mod).
 * - Any error thrown while importing is caught and rethrown as an Error with the
 *   message prefixed by "Failed to load release.config.js".
 *
 * @async
 * @param {string} [cwd=process.cwd()] - The directory to resolve release.config.js from.
 * @returns {Promise<object>} Promise that resolves to the normalized configuration (result of normalizeConfig(userConfig)).
 * @throws {Error} If dynamic import of the configuration file fails.
 */
async function loadReleaseConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, "release.config.js");

  if (!fs.existsSync(configPath)) {
    return normalizeConfig();
  }

  const fileUrl = pathToFileURL(configPath).href;

  let userConfig;

  try {
    const mod = await import(fileUrl);
    userConfig = mod.default ?? mod;
  } catch (err) {
    throw new Error(`Failed to load release.config.js\n${err.message}`);
  }

  return normalizeConfig(userConfig);
}

export const config = await loadReleaseConfig();
