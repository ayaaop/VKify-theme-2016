// esbuild plugin: collapses whitespace inside HTML-looking backtick template
// literals. Uses acorn to locate TemplateLiteral nodes and their quasis
// (static text segments), then rewrites each quasi's raw source in place.
// Interpolation expressions (${...}) are never touched. Nested template
// literals (templates inside ${...}) are handled correctly because acorn
// recurses into them.
//
// A template literal is only processed if at least one of its quasis looks
// like HTML (contains an angle-bracket-delimited tag). This keeps non-HTML
// strings (e.g. `foo ${bar} baz`) byte-identical.
//
// Transformations applied per quasi:
//   `>  <`        -> `><`           (whitespace between tags)
//   `\n` + WS     -> single space
//   multiple WS   -> single space

import fs from 'node:fs';
import { parse } from 'acorn';
import { simple as walkSimple } from 'acorn-walk';

function collapseHtmlWhitespace(s) {
    s = s.replace(/>\s+</g, '><');
    s = s.replace(/[ \t]*\n[ \t\n]*/g, ' ');
    s = s.replace(/[ \t]{2,}/g, ' ');
    return s;
}

function quasiLooksLikeHtml(quasis) {
    for (const q of quasis) {
        const s = q.value.raw;
        if (/<\s*[a-zA-Z/!]/.test(s) && />/.test(s)) return true;
    }
    return false;
}

export function templateHtmlMinify() {
    return {
        name: 'template-html-minify',
        setup(build) {
            build.onLoad({ filter: /\.js$/ }, async (args) => {
                const src = await fs.promises.readFile(args.path, 'utf8');
                if (src.indexOf('`') === -1) return null;

                let ast;
                try {
                    ast = parse(src, {
                        ecmaVersion: 'latest',
                        sourceType: 'script',
                        allowReturnOutsideFunction: true,
                        allowHashBang: true,
                    });
                } catch (err) {
                    console.warn(`[template-html-minify] acorn parse failed for ${args.path}: ${err.message}`);
                    return null;
                }

                // Collect every TemplateLiteral node (including nested ones).
                const rewrites = []; // { quasiStart, quasiEnd, replacement }

                walkSimple(ast, {
                    TemplateLiteral(node) {
                        if (!quasiLooksLikeHtml(node.quasis)) return;
                        for (const q of node.quasis) {
                            // Read raw text straight from source via acorn's offsets.
                            // We don't use q.value.raw because acorn normalises
                            // CRLF -> LF there, but we need to preserve exact bytes.
                            const raw = src.slice(q.start, q.end);
                            const collapsed = collapseHtmlWhitespace(raw);
                            if (collapsed === raw) continue;
                            rewrites.push({ start: q.start, end: q.end, replacement: collapsed });
                        }
                    },
                });

                if (rewrites.length === 0) return null;

                // Apply rewrites from the end so earlier offsets stay valid.
                rewrites.sort((a, b) => b.start - a.start);
                let out = src;
                for (const r of rewrites) {
                    out = out.slice(0, r.start) + r.replacement + out.slice(r.end);
                }

                return { contents: out, loader: 'js' };
            });
        },
    };
}
