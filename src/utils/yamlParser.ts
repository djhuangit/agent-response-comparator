import YAML from 'yaml';

export interface YamlObject {
  [key: string]: YamlValue;
}

export type YamlValue = string | number | boolean | null | YamlObject | YamlValue[];

export const parseYaml = (text: string): YamlObject => {
  try {
    const parsed = YAML.parse(text);

    // Handle case where parsed is null/undefined
    if (parsed === null || parsed === undefined) {
      return {};
    }

    // Handle case where parsed is not an object (e.g., just a string)
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: parsed };
    }

    return parsed as YamlObject;
  } catch (e) {
    throw new Error(`YAML parse error: ${(e as Error).message}`);
  }
};
