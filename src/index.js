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
