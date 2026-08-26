(function (global) {
  'use strict';

  function normalizeGitHubUrl(input) {
    var url = String(input || '').trim();
    if (!url) return '';
    var m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
    if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3] + '/' + m[4];
    return url.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/refs/heads/', '/');
  }

  function baseUrl(manifestUrl) {
    var u = normalizeGitHubUrl(manifestUrl);
    return u.slice(0, u.lastIndexOf('/') + 1);
  }

  function resolve(manifestUrl, child) {
    if (/^https?:\/\//i.test(String(child || ''))) return normalizeGitHubUrl(child);
    return baseUrl(manifestUrl) + String(child || '').replace(/^\.\//, '');
  }

  async function getJson(url) {
    var response = await fetch(normalizeGitHubUrl(url), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + url);
    return response.json();
  }

  async function load(manifestUrl) {
    var url = normalizeGitHubUrl(manifestUrl);
    if (!url) throw new Error('Missing manifest URL');
    var manifest = await getJson(url);
    var allFile = manifest && manifest.files && manifest.files.all;
    if (allFile) {
      var payload = await getJson(resolve(url, allFile));
      var rituals = Array.isArray(payload) ? payload : (payload.rituals || []);
      return { manifest: manifest, rituals: rituals, manifestUrl: url };
    }
    var bubbleFiles = manifest && manifest.files && manifest.files.bubbles;
    if (!bubbleFiles) throw new Error('Manifest has no ritual files');
    var names = Object.keys(bubbleFiles);
    var parts = await Promise.all(names.map(function (name) {
      return getJson(resolve(url, bubbleFiles[name]));
    }));
    var rituals = [];
    parts.forEach(function (p) { rituals = rituals.concat(Array.isArray(p) ? p : (p.rituals || [])); });
    return { manifest: manifest, rituals: rituals, manifestUrl: url };
  }

  global.ThinkStillLoader = { normalizeGitHubUrl: normalizeGitHubUrl, resolve: resolve, load: load };
})(window);
