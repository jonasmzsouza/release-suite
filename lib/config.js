import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function normalizeConfig(userConfig = {}) {
  return {
    tag: {
      prefix:
        userConfig?.tag?.prefix === "v"
          ? "v"
          : "",
    },

    changelog: {
      emojis:
        typeof userConfig?.changelog?.emojis === "boolean"
          ? userConfig.changelog.emojis
          : false,
    },
  };
}

async function loadReleaseConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, "release.config.js");

  const defaults = {
    tag: { prefix: "v" },
    changelog: { emojis: false },
  };

  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  const fileUrl = pathToFileURL(configPath).href;

  let userConfig;

  try {
    const mod = await import(fileUrl);
    userConfig = mod.default ?? mod;
  } catch (err) {
    throw new Error(
      `Failed to load release.config.js\n${err.message}`
    );
  }

  return normalizeConfig(userConfig);
}

export const config = await loadReleaseConfig();
