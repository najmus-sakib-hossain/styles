---
title: Mocking
description: Easily mock your oRPC handlers for testing.
---

# Mocking

Mock your oRPC handlers with ease.

::: warning
This page is incomplete and may be missing important information.
:::

## Using the Implementer

The [Implementer](/docs/contract-first/implement-contract#the-implementer) is designed for contract-first development. However, it can also be used to create alternative versions of your [router](/docs/router) or [procedure](/docs/procedure) for testing purposes.

```ts twoslash
import { router } from './shared/planet'
// ---cut---
import { implement, unlazyRouter } from '@orpc/server'

const fakeListPlanet = implement(router.planet.list).handler(() => [])
```

You can now use `fakeListPlanet` to replace `listPlanet`. Additionally, the `implement` function can be used to create a fake server for front-end testing.

::: warning
The `implement` function does not support the [lazy router](/docs/router#lazy-router) yet. Please use the `unlazyRouter` utility to convert your lazy router before implementing.
:::
