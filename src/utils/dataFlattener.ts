import { FieldValue } from '../types/evaluation';
import { YamlValue, YamlObject } from './yamlParser';

export const flattenObject = (
  obj: YamlValue,
  prefix: string = '',
  maxArrayItems: number | null = null
): FieldValue[] => {
  const result: FieldValue[] = [];

  if (obj === null || obj === undefined) {
    result.push({ field: prefix || 'value', value: 'null' });
    return result;
  }

  if (typeof obj !== 'object') {
    result.push({ field: prefix || 'value', value: String(obj) });
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result.push({ field: prefix, value: '[]' });
    } else if (typeof obj[0] === 'object' && obj[0] !== null) {
      result.push({ field: `${prefix} (count)`, value: `${obj.length} items` });
      const itemsToShow = maxArrayItems ? obj.slice(0, maxArrayItems) : obj;
      itemsToShow.forEach((item, idx) => {
        result.push(...flattenObject(item, `${prefix}[${idx}]`, maxArrayItems));
      });
      if (maxArrayItems && obj.length > maxArrayItems) {
        result.push({ field: `${prefix}[...]`, value: `... ${obj.length - maxArrayItems} more items` });
      }
    } else {
      result.push({ field: prefix, value: obj.join('\n') });
    }
    return result;
  }

  for (const key in obj as YamlObject) {
    const value = (obj as YamlObject)[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result.push({ field: newKey, value: 'null' });
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result.push({ field: newKey, value: '[]' });
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        result.push({ field: `${newKey} (count)`, value: `${value.length} items` });
        const itemsToShow = maxArrayItems ? value.slice(0, maxArrayItems) : value;
        itemsToShow.forEach((item, idx) => {
          result.push(...flattenObject(item, `${newKey}[${idx}]`, maxArrayItems));
        });
        if (maxArrayItems && value.length > maxArrayItems) {
          result.push({ field: `${newKey}[...]`, value: `... ${value.length - maxArrayItems} more items` });
        }
      } else {
        result.push({ field: newKey, value: (value as string[]).join('\n') });
      }
    } else if (typeof value === 'object') {
      result.push(...flattenObject(value, newKey, maxArrayItems));
    } else {
      result.push({ field: newKey, value: String(value) });
    }
  }
  return result;
};
