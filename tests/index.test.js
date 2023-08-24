import assert from "node:assert";
import { describe, it, test } from "node:test";
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

// describe("render", () => {
//   describe("component types", () => {
//     test("sync component", async () => {
//       function SyncComponent() {
//         return html`Hello world!`;
//       }

//       const stream = render(SyncComponent);
//       await assertStreamEqual(stream, "Hello world!");
//     })

//     test("promise component", async () => {
//       async function PromiseComponent() {
//         return html`Hello world!`;
//       }

//       const stream = render(PromiseComponent);
//       await assertStreamEqual(stream, "Hello world!");
//     });

//     test("generator component", async () => {
//       function* GeneratorComponent() {
//         yield html`Hello `;
//         yield html`world!`;
//       }

//       const stream = render(GeneratorComponent);
//       await assertStreamEqual(stream, "Hello world!");
//     });

//     test("async generator component", async () => {
//       async function* AsyncGeneratorComponent() {
//         yield html`Hello `;
//         await setTimeout(20);
//         yield html`world!`;
//       }

//       const stream = render(AsyncGeneratorComponent);
//       await assertStreamEqual(stream, "Hello world!");
//     });
//   });

//   describe("invalid component return", () => {
//     [
//       ["boolean", true],
//       ["number", 42],
//       ["string", "Hello world!"],
//       ["array", ["Hello ", "world!"]],
//       ["symbol", Symbol("Hello world!")],
//       ["object", { hello: "world" }],
//       ["function", () => "Hello world!"],
//       ["promise", Promise.resolve("Hello world!")],
//     ].forEach(([name, value]) => {
//       test(name, async () => {
//         function Literal() {
//           return value;
//         }

//         const stream = render(Literal);
//         await assert.rejects(() => consumeStream(stream), {
//           message: "Invalid template.",
//         });
//       });
//     });
//   });

//   test("null", async () => {
//     function Null() {
//       return null;
//     }

//     const stream = render(Null);
//     await assertStreamEqual(stream, "");
//   });

//   test("undefined", async () => {
//     function Undefined() {}

//     const stream = render(Undefined);
//     await assertStreamEqual(stream, "");
//   });

//   test("static", async () => {
//     function Static() {
//       return html`Hello world!`;
//     }

//     const stream = render(Static);
//     await assertStreamEqual(stream, "Hello world!");
//   });

//   test("dynamic", async () => {
//     function Dynamic() {
//       return html`Hello ${"world"}!`;
//     }

//     const stream = render(Dynamic);
//     await assertStreamEqual(stream, "Hello world!");
//   });

//   test("literal props", async () => {
//     function LiteralProps(props) {
//       return html`Hello ${props.name}!`;
//     }

//     const stream = render(LiteralProps, { name: "world" });
//     await assertStreamEqual(stream, "Hello world!");
//   });

//   test("promise", async () => {
//     function PromiseValue() {
//       const p = setTimeout(50).then(() => "world");
//       return html`Hello ${p}!`;
//     }

//     const stream = render(PromiseValue);
//     await assertStreamEqual(stream, "Hello world!");
//   });

//   test("sub-template", async () => {
//     function Iteration() {
//       const body = html`<p>Hello world!</p>`;
//       return html`<div>${body}</div>`;
//     }

//     const stream = render(Iteration);
//     await assertStreamEqual(stream, "<div><p>Hello world!</p></div>");
//   });

//   test("iteration", async () => {
//     function Iteration() {
//       const items = ["foo", "bar"];
//       return html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;
//     }

//     const stream = render(Iteration);
//     await assertStreamEqual(stream, "<ul><li>Hello</li><li>world</li><li>!</li></ul>");
//   });
// });

describe("render", () => {
  test("static template", async () => {
    const stream = render(html`Hello world!`);
    await assertStreamEqual(stream, "Hello world!");
  });

  test("multiple values", async () => {
    const stream = render(html`${'Hello'} ${'world'}!`);
    await assertStreamEqual(stream, "Hello world!");
  });

  test('template value', async () => {
    const stream = render(html`<div>${html`<p>Hello world!</p>`}</div>`);
    await assertStreamEqual(stream, "<div><p>Hello world!</p></div>");
  });

  describe('primitives values', () => {
    [
      ["null", null, ""],
      ["undefined", undefined, ""],
      ["boolean", true, "true"],
      ["number", 42, "42"],
      ["string", "hello world", "hello world"],
      ["bigint", 42n, "42"],
      ["symbol", Symbol("hello world"), "Symbol(hello world)"],
    ].forEach(([name, primitive, expected]) => {
      test(name, async () => {
        const stream = render(html`${primitive}`);
        await assertStreamEqual(stream, expected);
      });
    });
  });

  describe('promise values', () => {
    test('primitive', async () => {
      const stream = render(html`${Promise.resolve(42)}`);
      await assertStreamEqual(stream, "42");
    });
  
    test('template', async () => {
      const stream = render(html`${Promise.resolve(html`Hello world!`)}`);
      await assertStreamEqual(stream, "Hello world!");
    });
  });

  describe('iterable values', () => {
    test('array primitives', async () => {
      const stream = render(html`${[1, 2, 3]}`);
      await assertStreamEqual(stream, "123");
    });

    test('array templates', async () => {
      const items = ["foo", "bar"];
      const stream = render(html`<ul>${items.map(item => html`<li>${item}</li>`)}</ul>`);
      await assertStreamEqual(stream, "<ul><li>foo</li><li>bar</li></ul>");
    });
  
    test('iterable primitives', async () => {
      const iterable = (function *() {
        yield 1;
        yield 2;
        yield 3;
      })();
  
      const stream = render(html`${iterable}`);
      await assertStreamEqual(stream, "123");
    });

    test('iterable templates', async () => {
      const iterable = (function *() {
        yield html`<li>${'foo'}</li>`;
        yield html`<li>${'bar'}</li>`;
      })();
  
      const stream = render(html`<ul>${iterable}</ul>`);
      await assertStreamEqual(stream, "<ul><li>foo</li><li>bar</li></ul>");
    });
  });

  describe('async iterable values', () => {
    test('primitives', async () => {
      const iterable = (async function *() {
        yield 1;
        await setTimeout(5);
        yield 2;
        await setTimeout(5);
        yield 3;
      })();
  
      const stream = render(html`${iterable}`);
      await assertStreamEqual(stream, "123");
    });
  });

  test("flatten nested arrays", async () => {
    const value = [1,[[2, 3], 4]];
    const stream = render(html`${value}`);
    await assertStreamEqual(stream, "1234");
  });
});
