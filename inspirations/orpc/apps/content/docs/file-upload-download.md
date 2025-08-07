---
title: File Upload and Download
description: Learn how to upload and download files using oRPC.
---

# File Operations in oRPC

oRPC natively supports file uploads and downloads using standard [File](https://developer.mozilla.org/en-US/docs/Web/API/File) and [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects, requiring no additional configuration.

:::tip
For files larger than 100 MB, we recommend using a dedicated upload solution or [extending the body parser](/docs/advanced/extend-body-parser) for better performance and reliability, because oRPC does not support chunked or resumable uploads.
:::

## Validation

oRPC uses standard [File](https://developer.mozilla.org/en-US/docs/Web/API/File) and [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) objects for file operations.

```ts twoslash
import { os } from '@orpc/server'
import * as z from 'zod'
// ---cut---
const example = os
  .input(z.object({ file: z.file() }))
  .output(z.object({ file: z.instanceof(File) }))
  .handler(async ({ input }) => {
    console.log(input.file.name)
    return { file: input.file }
  })
```

:::info
For handling large files more efficiently, especially streaming downloads, consider using [lazy-file](https://www.npmjs.com/package/@mjackson/lazy-file) or similar libraries that allow you to work with files in a streaming manner.
:::
