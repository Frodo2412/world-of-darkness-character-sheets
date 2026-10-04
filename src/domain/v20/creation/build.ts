// A character in the middle of creation. Imports nothing from the other
// creation files, so its defaults are declared here.

/** The Storyteller's house settings for a build. */
export interface BuildSettings {
  baseGeneration: number;
  extraFreebies: number;
}

export interface V20Build {
  id: string;
  system: 'v20';
  kind: 'build';
  schemaVersion: 1;
  settings: BuildSettings;
}

const DEFAULT_BASE_GENERATION = 13;
const DEFAULT_EXTRA_FREEBIES = 0;

export function blankBuild(id: string): V20Build {
  return {
    id,
    system: 'v20',
    kind: 'build',
    schemaVersion: 1,
    settings: {
      baseGeneration: DEFAULT_BASE_GENERATION,
      extraFreebies: DEFAULT_EXTRA_FREEBIES,
    },
  };
}
