const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_MAX_STRING_CHARACTERS = 1_048_576;

export class StrictJsonParseError extends Error {
  constructor(readonly classification: 'malformed_json' | 'duplicate_key' | 'excessive_nesting' | 'oversized_string') {
    super('JSON input is invalid.');
    this.name = 'StrictJsonParseError';
  }
}

export function parseStrictJson(
  source: string,
  limits: { maxDepth?: number; maxStringCharacters?: number } = {},
): unknown {
  const parser = new StrictJsonParser(source, limits.maxDepth ?? DEFAULT_MAX_DEPTH,
    limits.maxStringCharacters ?? DEFAULT_MAX_STRING_CHARACTERS);
  return parser.parse();
}

class StrictJsonParser {
  private position = 0;
  constructor(private readonly source: string, private readonly maxDepth: number,
    private readonly maxStringCharacters: number) {}

  parse(): unknown {
    this.space();
    const value = this.value(0);
    this.space();
    if (this.position !== this.source.length) this.fail('malformed_json');
    return value;
  }

  private value(depth: number): unknown {
    if (depth > this.maxDepth) this.fail('excessive_nesting');
    this.space();
    const character = this.source[this.position];
    if (character === '{') return this.object(depth + 1);
    if (character === '[') return this.array(depth + 1);
    if (character === '"') return this.string();
    if (character === 't') return this.literal('true', true);
    if (character === 'f') return this.literal('false', false);
    if (character === 'n') return this.literal('null', null);
    if (character === '-' || (character >= '0' && character <= '9')) return this.number();
    return this.fail('malformed_json');
  }

  private object(depth: number): Record<string, unknown> {
    this.position++;
    const result: Record<string, unknown> = {};
    const keys = new Set<string>();
    this.space();
    if (this.consume('}')) return result;
    while (true) {
      this.space();
      if (this.source[this.position] !== '"') this.fail('malformed_json');
      const key = this.string();
      if (keys.has(key)) this.fail('duplicate_key');
      keys.add(key);
      this.space();
      if (!this.consume(':')) this.fail('malformed_json');
      Object.defineProperty(result, key, { value: this.value(depth), enumerable: true,
        configurable: true, writable: true });
      this.space();
      if (this.consume('}')) return result;
      if (!this.consume(',')) this.fail('malformed_json');
    }
  }

  private array(depth: number): unknown[] {
    this.position++;
    const result: unknown[] = [];
    this.space();
    if (this.consume(']')) return result;
    while (true) {
      result.push(this.value(depth));
      this.space();
      if (this.consume(']')) return result;
      if (!this.consume(',')) this.fail('malformed_json');
    }
  }

  private string(): string {
    const start = this.position++;
    let decodedCharacters = 0;
    while (this.position < this.source.length) {
      const code = this.source.charCodeAt(this.position);
      if (code === 0x22) {
        this.position++;
        const token = this.source.slice(start, this.position);
        let decoded: string;
        try { decoded = JSON.parse(token) as string; } catch { return this.fail('malformed_json'); }
        if (Array.from(decoded).length > this.maxStringCharacters) this.fail('oversized_string');
        if (hasUnpairedSurrogate(decoded)) this.fail('malformed_json');
        return decoded;
      }
      if (code < 0x20) this.fail('malformed_json');
      if (code === 0x5c) {
        this.position++;
        const escaped = this.source[this.position];
        if (!escaped || !'"\\/bfnrtu'.includes(escaped)) this.fail('malformed_json');
        if (escaped === 'u') {
          const hex = this.source.slice(this.position + 1, this.position + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('malformed_json');
          this.position += 4;
        }
      }
      this.position++;
      decodedCharacters++;
      if (decodedCharacters > this.maxStringCharacters * 6) this.fail('oversized_string');
    }
    return this.fail('malformed_json');
  }

  private number(): number {
    const remainder = this.source.slice(this.position);
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(remainder);
    if (!match) return this.fail('malformed_json');
    this.position += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) this.fail('malformed_json');
    return value;
  }

  private literal<T>(token: string, value: T): T {
    if (!this.source.startsWith(token, this.position)) this.fail('malformed_json');
    this.position += token.length;
    return value;
  }

  private consume(character: string): boolean {
    if (this.source[this.position] !== character) return false;
    this.position++;
    return true;
  }

  private space(): void {
    while (' \t\r\n'.includes(this.source[this.position] ?? 'x')) this.position++;
  }

  private fail(classification: StrictJsonParseError['classification']): never {
    throw new StrictJsonParseError(classification);
  }
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index++;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}
