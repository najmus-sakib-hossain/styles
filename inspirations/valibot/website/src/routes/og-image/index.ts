import type { RequestHandler } from '@builder.io/qwik-city';
import { ImageResponse } from '@vercel/og';
import { html } from 'satori-html';

async function fetchFont(url: string) {
  const response = await fetch(url);
  return response.arrayBuffer();
}

export const onGet: RequestHandler = async ({ cacheControl, send, url }) => {
  // Disable caching
  cacheControl('no-cache');

  // Get data from search params
  const title = url.searchParams.get('title');
  const description = url.searchParams.get('description');
  const path = url.searchParams.get('path');

  // Create icon and font directory URL
  const iconUrl = import.meta.env.PUBLIC_WEBSITE_URL + '/icon-192px.png';
  const fontDirUrl = import.meta.env.PUBLIC_WEBSITE_URL + '/fonts';

  // Fetch font data
  const [lexend400Data, lexend500Data, lexendExa500Data] = await Promise.all([
    fetchFont(fontDirUrl + '/lexend-400.ttf'),
    fetchFont(fontDirUrl + '/lexend-500.ttf'),
    fetchFont(fontDirUrl + '/lexend-exa-500.ttf'),
  ]);

  // Create Lexend 400 font object
  const lexend400 = {
    name: 'Lexend',
    data: lexend400Data,
    style: 'normal',
    weight: 400,
  } as const;

  // Create Lexend 500 font object
  const lexend500 = {
    name: 'Lexend',
    data: lexend500Data,
    style: 'normal',
    weight: 500,
  } as const;

  // Create Lexend Exa 500 font object
  const lexendExa500 = {
    name: 'Lexend Exa',
    data: lexendExa500Data,
    style: 'normal',
    weight: 500,
  } as const;

  // If title is available, return image with text
  if (title) {
    send(
      new ImageResponse(
        html`
          <div
            tw="flex h-full w-full flex-col justify-between bg-gray-900 p-16"
            style="font-family: 'Lexend'"
          >
            <div tw="flex items-center justify-between">
              <div tw="flex items-center">
                <img tw="w-16 h-16" src="${iconUrl}" />
                <div
                  tw="text-4xl font-medium text-slate-300 ml-4"
                  style="font-family: 'Lexend Exa'"
                >
                  Valibot
                </div>
              </div>
              <div
                tw="max-w-[50%] text-4xl text-slate-500"
                style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >
                valibot.dev${path ? `/` + path : ''}
              </div>
            </div>
            <div tw="flex flex-col">
              <h1
                tw="max-w-[80%] text-6xl font-medium leading-normal text-slate-200"
                style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >
                ${title}
              </h1>
              <p
                tw="text-4xl text-slate-400 leading-loose"
                style="${description ? '' : 'display: none'}"
              >
                ${description
                  ? description.length > 110
                    ? description.slice(0, 110).trimEnd() + '...'
                    : description
                  : ''}
              </p>
            </div>
          </div>
        `,
        {
          width: 1200,
          height: 630,
          fonts: [lexend400, lexend500, lexendExa500],
        }
      )
    );

    // Otherwise, return image just with logo
  } else {
    send(
      new ImageResponse(
        html`
          <div
            tw="flex h-full w-full items-center justify-center bg-gray-900"
            style="font-family: 'Lexend Exa'"
          >
            <div tw="flex items-center">
              <img tw="w-36 h-36" src="${iconUrl}" />
              <div tw="text-8xl font-medium text-slate-300 ml-10">Valibot</div>
            </div>
          </div>
        `,
        {
          width: 1200,
          height: 630,
          fonts: [lexendExa500],
        }
      )
    );
  }
};
