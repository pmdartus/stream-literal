/**
 * @typedef {{ __render(): string }} Template
 */

/**
 * @typedef {void | null | undefined | Template | Promise<Template> | Generator<Template> | AsyncGenerator<Template>} ComponentOutput
 */

/**
 * @template [P={}]
 * @typedef {(props: P) => ComponentOutput} Component<P>
 */

/**
 * Template literal cache. Tagged template literal are always invoked with the
 * same statics array, so we can cache the template function.
 * 
 * @type {WeakMap<ReadonlyArray<string>, Template>}
 */
const TEMPLATE_CACHE = new WeakMap();

const TEMPLATE_SYMBOL = Symbol("template");

function isTemplate(value) {
  return value && value[TEMPLATE_SYMBOL];
}

/**
 * 
 * @param {ReadonlyArray<string>} statics 
 * @param  {Array<unknown>} dynamics
 *  
 * @returns {Template}
 */
function createTemplate(statics, ...dynamics) {
  const tmpl = async function* () {
    for (let i = 0; i < statics.length; i++) {
      yield statics[i];
      if (i < dynamics.length) {
        const value = dynamics[i];

        if (value === null || value === undefined) continue;

        if (isTemplate(value)) {
          yield* value();
        } else {
          yield value;
        }
      }
    }
  };
  tmpl[TEMPLATE_SYMBOL] = true;

  return tmpl;
}

/**
 * 
 * @param {ReadonlyArray<string>} statics 
 * @param  {Array<unknown>} dynamics
 *  
 * @returns {Template}
 */
export function html(statics, ...dynamics) {
  let tmpl = TEMPLATE_CACHE.get(statics);

  // If the template is not in the cache, create it and add it to the cache.
  if (tmpl === undefined) {
    tmpl = createTemplate(statics, ...dynamics);
    TEMPLATE_CACHE.set(statics, tmpl);
  }

  return tmpl;
}

/**
 * 
 * @param {Template} part
 */
async function* renderTemplate(part) {
  if (isTemplate(part)) {
    yield* part();
  } else {
    throw new Error("Invalid template.");
  }
}

/**
 * Turn a component output into an async generator of strings.
 * 
 * @param {ComponentOutput} value 
 * @returns {AsyncGenerator<string>}
 */
async function* unwrapRenderOutput(value) {
  if (value === null || value === undefined) {
    return;
  } else if (value instanceof Promise) {
    const resolved = await value;
    yield* renderTemplate(resolved);
  } else if (typeof value === "object" && Symbol.iterator in value) {
    for (const part of value) {
      yield* renderTemplate(part);
    }
  } else if (typeof value === "object" && Symbol.asyncIterator in value) {
    for await (const part of value) {
      yield* renderTemplate(part);
    }
  } else {
    yield* renderTemplate(value);
  }
}

/**
 * Render a component to a readable stream.
 *
 * @template P
 * @param {Component<P>} component - The component to render.
 * @param {P} props - The props to pass to the component.
 *
 * @returns {ReadableStream<string>} A readable stream of the rendered component.
 */
export function render(component, props) {
  const output = component(props);
  const result = unwrapRenderOutput(output);

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result) {
        controller.enqueue(chunk);
      }

      controller.close();
    },
  });
}
