import { fetch } from '../../util';

const TYPINGS_URL =
  'https://typespublisher.blob.core.windows.net/typespublisher/data/search-index-min.json';

function assumeTypingName(module: string): string {
  const matches = /^@([^/]+)\/(.*)$/i.exec(module);
  if (matches === null) {
    return module;
  }
  matches.shift();
  return matches.join('__');
}

export function getTypings(modules: string[]): string[] {
  return (JSON.parse(fetch(TYPINGS_URL)) as Array<{ t: string }>)
    .filter(typing =>
      modules.some(module => assumeTypingName(module) === typing.t),
    )
    .map(typing => `@types/${typing.t}`);
}
