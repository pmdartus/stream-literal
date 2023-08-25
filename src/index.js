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
 * @param {TemplateResult} template
 * @returns {AsyncGenerator<string>}
 */
async function* renderTemplate(template) {
  const { strings, values } = template;
  for (let i = 0; i < strings.length; i++) {
    yield strings[i];

    if (i < values.length) {
      const value = values[i];
      yield* renderValue(value);
    }
  }
}

const TEXT_MODE = 1;
const ELEMENT_MODE = 2;
const MODE_COMMENT = 3;

const TEXT_PART = 1;
const COMPONENT_PART = 2;
const VALUE_PART = 3;

/**
 * TODO: Is it more efficient to use objects everywhere instead of a mix of string and objects?
 * 
 * @typedef {string} TextPart
 * @typedef {{ kind: COMPONENT_PART, fn: Component, props: Record<string, any>  }} ComponentPart
 * @typedef {{ kind: VALUE_PART, value: unknown  }} ValuePart
 * 
 * @typedef {TextPart | ComponentPart | ValuePart} TemplatePart
 */

/**
 * @param {TemplateResult} template 
 * @returns {TemplatePart[]}
 * 
 * TODO: This function only need to receive the static parts and not the values.
 * 
 */
export function parseTemplate(template) {
  const { strings } = template;

  /** @type {TemplatePart[]} */
  const root = [];

  let mode = TEXT_MODE;
  let buffer = '';

  let current = root;

  for (let i = 0; i < strings.length; i++) {
    const string = strings[i];

    for (let j = 0; j < string.length; j++) {
      if (mode === TEXT_MODE) {
        let cursor = j;
        while (string[cursor] !== '<' && cursor < string.length) {
          cursor++;
        }

        buffer += string.slice(j, cursor);
        j = cursor;
      }
    }

    if (buffer !== '') {
      root.push(buffer);
    }
  }

  return root;
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
