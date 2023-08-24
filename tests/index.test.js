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
