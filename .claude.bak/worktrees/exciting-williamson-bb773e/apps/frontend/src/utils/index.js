export function createPageUrl(pageName) {
  return '/' + String(pageName).replace(/ /g, '-');
}
