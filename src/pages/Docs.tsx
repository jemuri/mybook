import { useState } from 'react'
import Mermaid from 'react-mermaid2'
import bookRawText from '../../doc/book.txt?raw'
import { parseBookToChapterPages, buildReadableChapterContent, type BookChapterPage } from '../utils/bookParser'
import './Docs.css'

const chapterPages = parseBookToChapterPages(bookRawText).map((page) => ({
  ...page,
  content: buildReadableChapterContent(page)
}))

const parseContent = (content: string) => {
  const parts: JSX.Element[] = []
  const mermaidRegex = /```mermaid([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mermaidRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(parseMarkdown(content.slice(lastIndex, match.index), parts.length))
    }

    parts.push(
      <div key={`mermaid-${parts.length}`} className="mermaid-wrapper" style={{ margin: '20px 0', textAlign: 'center' }}>
        <Mermaid chart={match[1].trim()} />
      </div>
    )
    lastIndex = mermaidRegex.lastIndex
  }

  if (lastIndex < content.length) {
    parts.push(parseMarkdown(content.slice(lastIndex), parts.length))
  }

  return parts
}

const parseMarkdown = (text: string, index: number) => {
  const html = text
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/\|(.*?)\|/g, (matched) => {
      if (matched.includes('---')) return ''
      return `<tr>${matched
        .split('|')
        .filter(Boolean)
        .map((cell) => `<td>${cell.trim()}</td>`)
        .join('')}</tr>`
    })
    .replace(/(<tr>.*?<\/tr>)/g, '<table border="1" cellpadding="8" cellspacing="0">$1</table>')
    .replace(/\n/g, '<br>')
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .replace(/<br>(\s*<(h1|h2|h3|ul|pre|table))/g, '$1')
    .replace(/(<\/(h1|h2|h3|ul|pre|table)>)\s*<br>/g, '$1')

  return <div key={`text-${index}`} dangerouslySetInnerHTML={{ __html: html }} />
}

const Docs = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set([chapterPages[0]?.id ?? '']))

  if (chapterPages.length === 0) {
    return <div className="content-area">book.txt 暂无可展示内容</div>
  }

  const currentChapter = chapterPages[currentIndex]

  const openChapter = (index: number) => {
    setCurrentIndex(index)
    setExpandedChapterIds((prev) => new Set([...prev, chapterPages[index].id]))
  }

  const toggleChapter = (chapterId: string) => {
    setExpandedChapterIds((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }

  return (
    <div className="docs-container">
      <aside className="sidebar">
        <div className="sidebar-content">
          {chapterPages.map((chapter: BookChapterPage, index) => (
            <div key={chapter.id} className="chapter-item">
              <div className="section-title" onClick={() => toggleChapter(chapter.id)}>
                <span className="toggle-icon">{expandedChapterIds.has(chapter.id) ? '▼' : '▶'}</span>
                {chapter.title}
              </div>
              {expandedChapterIds.has(chapter.id) && (
                <div className="points">
                  <div
                    className={`point-item ${currentIndex === index ? 'active' : ''}`}
                    onClick={() => openChapter(index)}
                  >
                    进入本章
                  </div>
                  {chapter.toc.slice(0, 12).map((item) => (
                    <div key={`${chapter.id}-${item}`} className="point-item" onClick={() => openChapter(index)}>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="content-area">
        <div className="pager-row">
          <button className="pager-btn" disabled={currentIndex === 0} onClick={() => setCurrentIndex((v) => Math.max(0, v - 1))}>
            上一页
          </button>
          <span className="pager-info">
            第 {currentIndex + 1} / {chapterPages.length} 页
          </span>
          <button
            className="pager-btn"
            disabled={currentIndex === chapterPages.length - 1}
            onClick={() => setCurrentIndex((v) => Math.min(chapterPages.length - 1, v + 1))}
          >
            下一页
          </button>
        </div>

        <div className="content-header">
          <h1>{currentChapter.title}</h1>
        </div>
        <div className="content-body markdown-body">{parseContent(currentChapter.content)}</div>

        <div className="pager-row bottom-pager">
          <button className="pager-btn" disabled={currentIndex === 0} onClick={() => setCurrentIndex((v) => Math.max(0, v - 1))}>
            上一页
          </button>
          <button
            className="pager-btn"
            disabled={currentIndex === chapterPages.length - 1}
            onClick={() => setCurrentIndex((v) => Math.min(chapterPages.length - 1, v + 1))}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  )
}

export default Docs
