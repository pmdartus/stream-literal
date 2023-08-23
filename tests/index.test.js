import assert from "node:assert";
import { describe, test } from "node:test";
import { setTimeout } from "node:timers/promises";

import { html, render } from "../src/index.js";

/**
 * Read a stream and return the result as a string.
 * 
 * @param {ReadableStream<string>} stream
 * @returns {Promise<string>}
 */
async function consumeStream(stream) {
  const result = [];
  for await (const chunk of stream) {
    result.push(chunk);
  }
  return result.join("");
}

/**
 * Assert that a stream produces the expected result.
 *
 * @param {ReadableStream<string>} stream
 * @param {string} expected
 */
async function assertStreamEqual(stream, expected) {
  const result = await consumeStream(stream);
  assert.strictEqual(result, expected);
}

describe("render", () => {
  describe("component types", () => {
    test("sync component", async () => {
      function SyncComponent() {
        return html`Hello world!`;
      }
  
      const stream = render(SyncComponent);
      await assertStreamEqual(stream, "Hello world!");
    })
  
    test("promise component", async () => {
      async function PromiseComponent() {
        return html`Hello world!`;
      }
  
      const stream = render(PromiseComponent);
      await assertStreamEqual(stream, "Hello world!");
    });
  
    test("generator component", async () => {
      function* GeneratorComponent() {
        yield html`Hello `;
        yield html`world!`;
      }
  
      const stream = render(GeneratorComponent);
      await assertStreamEqual(stream, "Hello world!");
    });
  
    test("async generator component", async () => {
      async function* AsyncGeneratorComponent() {
        yield html`Hello `;
        await setTimeout(20);
        yield html`world!`;
      }
  
      const stream = render(AsyncGeneratorComponent);
      await assertStreamEqual(stream, "Hello world!");
    });
  });

  describe("invalid component return", () => {
    [
      ["boolean", true],
      ["number", 42],
      ["string", "Hello world!"],
      ["array", ["Hello ", "world!"]],
      ["symbol", Symbol("Hello world!")],
      ["object", { hello: "world" }],
      ["function", () => "Hello world!"],
      ["promise", Promise.resolve("Hello world!")],
    ].forEach(([name, value]) => {
      test(name, async () => {
        function Literal() {
          return value;
        }

        const stream = render(Literal);
        await assert.rejects(() => consumeStream(stream), {
          message: "Invalid template.",
        });
      });
    });
  });

  test("null", async () => {
    function Null() {
      return null;
    }

    const stream = render(Null);
    await assertStreamEqual(stream, "");
  });

  test("undefined", async () => {
    function Undefined() {}

    const stream = render(Undefined);
    await assertStreamEqual(stream, "");
  });

  test("static", async () => {
    function Static() {
      return html`Hello world!`;
    }

    const stream = render(Static);
    await assertStreamEqual(stream, "Hello world!");
  });

  test("dynamic", async () => {
    function Dynamic() {
      return html`Hello ${"world"}!`;
    }

    const stream = render(Dynamic);
    await assertStreamEqual(stream, "Hello world!");
  });

  test("literal props", async () => {
    function LiteralProps(props) {
      return html`Hello ${props.name}!`;
    }

    const stream = render(LiteralProps, { name: "world" });
    await assertStreamEqual(stream, "Hello world!");
  });

  test("promise", async () => {
    function PromiseValue() {
      const p = setTimeout(50).then(() => "world");
      return html`Hello ${p}!`;
    }

    const stream = render(PromiseValue);
    await assertStreamEqual(stream, "Hello world!");
  });

  test("sub-template", async () => {
    function Iteration() {
      const body = html`<p>Hello world!</p>`;
      return html`<div>${body}</div>`;
    }

    const stream = render(Iteration);
    await assertStreamEqual(stream, "<div><p>Hello world!</p></div>");
  });

  test("iteration", async () => {
    function Iteration() {
      const items = ["foo", "bar"];
      return html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;
    }

    const stream = render(Iteration);
    await assertStreamEqual(stream, "<ul><li>Hello</li><li>world</li><li>!</li></ul>");
  });
});
