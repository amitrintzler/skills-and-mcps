export function printHint(message: string): void {
  console.log(`Hint: ${message}`);
}

export function printSection(title: string): void {
  console.log(`\n${title}`);
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
