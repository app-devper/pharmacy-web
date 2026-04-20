import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Spinner from '../components/ui/Spinner'

/**
 * Convert heading text to an anchor id compatible with GitHub's slugger — the
 * TOC at the top of USER_GUIDE.md uses GitHub-style fragments
 * (`#หน้าขาย--flow-พื้นฐาน`) so we must match that normalization:
 *   • lowercase
 *   • trim, replace whitespace runs with single `-`
 *   • strip characters outside [a-z0-9-_ and non-ASCII letters (Thai)]
 *   • drop leading emoji / pictograph blocks
 * Keeping this as a pure util means the HelpPage markdown renderer and any
 * future back-to-top button share the same slug logic.
 */
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    // Drop emoji / pictographs (most are in these ranges). Pure Latin/Thai
    // characters survive.
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F100}-\u{1F2FF}]/gu, '')
    // Strip anything that's not a letter (any script), digit, hyphen, or space.
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Extract plain text from a ReactMarkdown heading's children — needed because
 *  children may be a React node array (e.g. `[text, <em>...</em>, text]`). */
function nodeText(node: unknown): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  // Heuristic: React element with `.props.children`
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props
    return nodeText(props?.children)
  }
  return ''
}

/**
 * HelpPage — fetches and renders /USER_GUIDE.md as styled HTML.
 *
 * The markdown file is stored in `frontend/public/USER_GUIDE.md` so Vite
 * serves it at the site root and the PWA service worker precaches it
 * automatically (offline-friendly). react-markdown parses into React nodes
 * without eval-ing any HTML, so the rendered output is XSS-safe even if the
 * file is ever edited to contain `<script>` tags.
 */
export default function HelpPage() {
  const [md, setMd] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/USER_GUIDE.md', { cache: 'no-cache' })
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.statusText))))
      .then(setMd)
      .catch(e => setError(String(e)))
  }, [])

  if (error) {
    return <div className="p-6 text-sm text-red-500">โหลดคู่มือไม่สำเร็จ: {error}</div>
  }
  if (!md) return <Spinner />

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <article
        className="prose prose-slate max-w-none
          prose-headings:scroll-mt-20
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
          prose-h1:mt-0
          prose-a:text-blue-600 hover:prose-a:text-blue-700
          prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:text-xs
          prose-table:text-sm prose-table:border-collapse
          prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-gray-200 prose-th:text-left
          prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-100
          prose-blockquote:border-blue-400 prose-blockquote:text-gray-600 prose-blockquote:not-italic
          prose-li:my-0.5"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Auto-assign anchor ids so the TOC at the top of the guide can
            // jump to each section. Matches GitHub's slug conventions.
            h1: ({ children, ...props }) => (
              <h1 id={slugify(nodeText(children))} {...props}>{children}</h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 id={slugify(nodeText(children))} {...props}>{children}</h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 id={slugify(nodeText(children))} {...props}>{children}</h3>
            ),
            // External / repo links open in a new tab; in-page anchors stay in place.
            a: ({ href, children, ...props }) => {
              const internal = href?.startsWith('#')
              return (
                <a
                  href={href}
                  {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  {...props}
                >
                  {children}
                </a>
              )
            },
          }}
        >
          {md}
        </ReactMarkdown>
      </article>
    </div>
  )
}
