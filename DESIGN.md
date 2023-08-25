## Wishlist  
- [ ] Promise, Iterable an AsyncIterable protocols values
- [ ] Out of order rendering
- [ ] Error boundary
- [ ] Context like API


## Notes

- Use a Babel transform to skip runtime parsing for production. Similar to what Vue is doing, quick iteration in dev mode without a build step and opt-in compilation step for production.
- What are the pattern emerging from this + [`htmx`](https://htmx.org/). Eg, serving partials vs full pages.
- What is the best approach for composition?
    - `<slot>` approach (web component, Vue, Svelte, Astro): Support targeting multiple elements using a mix of default and named slots. More declarative. 
    - JSX approach (React, Solid): Passing a single `children` object.
    - Vue + JSX: Vue also support JSX syntax for passing [slot](https://vuejs.org/guide/extras/render-function.html#passing-slots) instead of passing an array of children, the component pass an object with slot being defined as functions.
    - Marko uses a different [composition approach](https://markojs.com/docs/body-content/). The slot content is declared in the template with special tag, the slot container is defined on the other hand as an expression.

## References
- Lit:
    - [Lit expression documentation](https://lit.dev/docs/templates/expressions/#child-expressions)
    - [`lit-html` parsing logic](https://github.com/lit/lit/blob/main/packages/lit-html/src/lit-html.ts)
- [`htm`](https://github.com/developit/htm)
- [`swtl`](https://github.com/thepassle/swtl)