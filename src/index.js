/**
 * @typedef {{
 *  [TEMPLATE_MARKER]: true,
 *  strings: TemplateStringsArray,
 *  values: Array<unknown>,
 * }} TemplateResult
 */

/**
 * @typedef {void | null | undefined | TemplateResult | Promise<TemplateResult> | Generator<TemplateResult> | AsyncGenerator<TemplateResult>} ComponentOutput
 */

/**
 * @template [P={}]
 * @typedef {(props: P) => ComponentOutput} Component<P>
 */

const TEMPLATE_MARKER = Symbol("template");

/**
 * Generate a template from a tagged template literal.
 *
 * @param {TemplateStringsArray} strings
 * @param  {Array<unknown>} values
 *
 * @returns {TemplateResult}
 */
export function html(strings, ...values) {
  return {
    [TEMPLATE_MARKER]: true,
    strings,
    values,
  };
}

/**
 * @typedef {null | undefined | number | string | bigint | symbol} PrimitiveValue
 */

/**
 *
 * @param {unknown} value
 * @returns {value is PrimitiveValue}
 */
function isPrimitive(value) {
  return (
    value === null || (typeof value !== "object" && typeof value !== "function")
  );
}

/**
 * @param {unknown} value
 * @returns {value is Promise<unknown>}
 */
function isPromise(value) {
  return value instanceof Promise;
}

/**
 * @param {object} value
 * @returns {value is Iterable<unknown>}
 */
function isIterable(value) {
  return Symbol.iterator in value;
}

/**
 * @param {object} value
 * @returns {value is AsyncIterable<unknown>}
 */
function isAsyncIterable(value) {
  return Symbol.asyncIterator in value;
}

/**
 *
 * @param {unknown} value
 * @returns {value is TemplateResult}
 */
function isTemplateResult(value) {
  return (
    typeof value === "object" && value !== null && TEMPLATE_MARKER in value
  );
}

/**
 * @param {unknown} value
 * @returns {AsyncGenerator<string>}
 */
async function* renderValue(value) {
  if (value === undefined || value === null) {
    return;
  } else if (isPrimitive(value)) {
    const str = String(value);

    // Don't emit empty strings.
    if (str !== "") {
      yield str;
    }
  } else if (typeof value === "object") {
    if (isPromise(value)) {
      yield* renderValue(await value);
    } else if (isIterable(value)) {
      for (const item of value) {
        yield* renderValue(item);
      }
    } else if (isAsyncIterable(value)) {
      for await (const item of value) {
        yield* renderValue(item);
      }
    } else if (isTemplateResult(value)) {
      yield* renderTemplate(value);
    }
  } else {
    throw new Error(`Invalid template value: ${value}`);
  }
}

/**
 * @param {TemplatePart[]} parts
 * @param {unknown[]} values
 * @returns {AsyncGenerator<string>}
 */
async function* renderTemplateParts(parts, values) {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    switch (part.kind) {
      case STATIC_PART:
        yield part.value;
        break;
    
      case VALUE_PART:
        yield* renderValue(values[part.idx]);
        break;
    }
  }
}

/**
 * @param {TemplateResult} template 
 * @returns {AsyncGenerator<string>}
 */
function renderTemplate(template) {
  const { strings, values } = template;

  const parts = parseTemplate(strings);
  return renderTemplateParts(parts, values);
}

const TEXT_MODE = 1;
const ELEMENT_MODE = 2;
const MODE_COMMENT = 3;

const STATIC_PART = 1;
const VALUE_PART = 2;

/**
 * @typedef {{ kind: STATIC_PART, value: string }} StaticPart
 * @typedef {{ kind: VALUE_PART, idx: number  }} ValuePart
 * 
 * @typedef {StaticPart | ValuePart} TemplatePart
 */

/**
 * @param {TemplateStringsArray} strings 
 * @returns {TemplatePart[]}
 */
export function parseTemplate(strings) {
  /** @type {TemplatePart[]} */
  const parts = [];

  for (let i = 0; i < strings.length; i++) {
    const string = strings[i];
    parts.push({ kind: STATIC_PART, value: string });

    if (i < strings.length - 1) {
      parts.push({ kind: VALUE_PART, idx: i });
    }
  }

  return parts;
}

/**
 * @param {TemplateResult} value
 * @returns {ReadableStream<string>}
 */
export function render(value) {
  const result = renderTemplate(value);

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result) {
        controller.enqueue(chunk);
      }

      controller.close();
    },
  });
}
