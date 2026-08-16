import type { Plugin } from "vite";

/**
 * Fill `%TOKEN%` placeholders in the HTML from the TypeScript constants that
 * actually enforce them, so the picker label and the marketing copy can't drift
 * from the limit that rejects your file. A miss throws: an unsubstituted
 * `%MAX_FILE_LABEL%` shipping to production is worse than a failed build.
 * 
 * Also replaces tokens in locale TypeScript files (shared/i18n/locales/*.ts)
 * before they're compiled, so the hosted build doesn't ship untranslated tokens.
 * 
 * Runtime tokens (MAX_FILE_LABEL, MAX_SNIPPET_LABEL) are replaced in locale files,
 * while build-time only tokens (TOP_SPEED, APP_VERSION, BUILD_ID) are left for
 * the i18n-pages plugin to handle during HTML generation.
 */
export function htmlTokens(tokens: Record<string, string>): Plugin {
  // Tokens that should be replaced in locale TypeScript files
  const RUNTIME_TOKENS = ["MAX_FILE_LABEL", "MAX_SNIPPET_LABEL"];
  
  return {
    name: "html-tokens",
    enforce: "pre",
    transformIndexHtml(html) {
      for (const [token, value] of Object.entries(tokens)) {
        html = html.replaceAll(`%${token}%`, value);
      }
      const leftover = /%[A-Z][A-Z0-9_]*%/.exec(html);
      if (leftover) throw new Error(`unsubstituted HTML token ${leftover[0]}`);
      return html;
    },
    transform(code, id) {
      // Replace runtime tokens in locale TypeScript files
      if (id.includes("/shared/i18n/locales/") && id.endsWith(".ts")) {
        let result = code;
        for (const token of RUNTIME_TOKENS) {
          if (token in tokens) {
            result = result.replaceAll(`%${token}%`, tokens[token]!);
          }
        }
        // Check for leftover runtime tokens only
        const leftover = new RegExp(`%(${RUNTIME_TOKENS.join("|")})%`).exec(result);
        if (leftover) {
          throw new Error(`unsubstituted runtime token ${leftover[0]} in ${id}`);
        }
        return { code: result, map: null };
      }
    },
  };
}
