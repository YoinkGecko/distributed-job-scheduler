function toCamelCaseString(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

export function snakeToCamel<T = any>(obj: any): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle Dates, Buffer, or other special objects without converting their keys
  if (obj instanceof Date || obj instanceof RegExp) {
    return obj as unknown as T;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamel(item)) as unknown as T;
  }


  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = toCamelCaseString(key);
    acc[camelKey] = snakeToCamel(obj[key]);
    return acc;
  }, {} as Record<string, any>) as T;
}