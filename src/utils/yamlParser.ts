export interface YamlObject {
  [key: string]: YamlValue;
}

export type YamlValue = string | number | boolean | null | YamlObject | YamlValue[];

export const parseYaml = (text: string): YamlObject => {
  const lines = text.split('\n');
  const result: YamlObject = {};
  const stack: Array<{ obj: YamlObject | YamlValue[]; indent: number }> = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const content = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (content.startsWith('- ')) {
      const itemContent = content.slice(2);
      if (!Array.isArray(parent)) {
        const keys = Object.keys(parent as YamlObject);
        const lastKey = keys[keys.length - 1];
        const parentObj = parent as YamlObject;
        if (parentObj[lastKey] === null || parentObj[lastKey] === undefined) {
          parentObj[lastKey] = [];
        }
        if (Array.isArray(parentObj[lastKey])) {
          const arr = parentObj[lastKey] as YamlValue[];
          if (itemContent.includes(': ')) {
            const obj: YamlObject = {};
            const [k, ...v] = itemContent.split(': ');
            obj[k] = v.join(': ');
            arr.push(obj);
            stack.push({ obj: obj, indent: indent });
          } else {
            arr.push(itemContent);
          }
        }
      }
    } else if (content.includes(': ')) {
      const colonIdx = content.indexOf(': ');
      const key = content.slice(0, colonIdx);
      const value = content.slice(colonIdx + 2);

      if (value === '' || value === '|') {
        (parent as YamlObject)[key] = {};
        stack.push({ obj: (parent as YamlObject)[key] as YamlObject, indent: indent });
      } else {
        (parent as YamlObject)[key] = value;
      }
    }
  }

  return result;
};
