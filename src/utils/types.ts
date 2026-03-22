export function parseValue(value: unknown, type: string): unknown {
  try {
    const textValue = String(value);
    switch (type.toLowerCase()) {
      case "integer":
      case "number":
      case "float": {
        const number = parseFloat(textValue);
        return isNaN(number) ? value : number;
      }
      case "boolean":
        return (
          value === "1" || value === 1 || value === "true" || value === true
        );
      case "date":
      case "datetime": {
        const date = new Date(textValue);
        return isNaN(date.getTime()) ? value : date;
      }
      case "json":
      case "object":
      case "array":
      case "map":
      case "set": {
        if (typeof value !== "string") {
          return value;
        }
        return JSON.parse(value);
      }
      default:
        return value;
    }
  } catch {
    return value;
  }
}
