export function parseValue(value: any, type: string): any {
  try {
    switch (type.toLowerCase()) {
      case 'integer':
      case 'number':
      case 'float': {
        const number = parseFloat(value);
        return isNaN(number) ? value : number;
      }
      case 'boolean':
        return value === '1' || value === 1 || value === 'true' || value === true;
      case 'date':
      case 'datetime':
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      case 'json':
      case 'object':
      case 'array':
      case 'map':
      case 'set': {
        return JSON.parse(value);
      }
      default:
        return value;
    }
  } catch {
    return value;
  }
}