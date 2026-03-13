export interface BookChapterPage {
  id: string
  title: string
  content: string
  toc: string[]
}

export interface GeneratedQuestion {
  id: string
  pointId: string
  title: string
  options: string[]
  answer: string
  analysis: string
}

const BIG_CHAPTER_RE = /^[一二三四五六七八九十]+[、:：].*篇$/
const PART_RE = /^(上篇|下篇|中篇)$/
const NUMBERED_RE = /^(\d+|[一二三四五六七八九十]+)[、:：]\s*(.+)$/

const cleanLine = (line: string) => line.trim().replace(/\u200b/g, '')

const isLikelyHeading = (line: string) => {
  const text = cleanLine(line)
  if (!text) return false
  if (text.length > 24) return false
  if (/^(#|```|\||-|\*|img|image-|http)/i.test(text)) return false
  if (/^[A-Za-z0-9_]+$/.test(text)) return false
  if (/[，。；？！,.!?()=]/.test(text)) return false
  return true
}

const isNoiseLine = (line: string) => {
  const text = cleanLine(line).toLowerCase()
  return text === 'img' || text.startsWith('image-')
}

const isJavaCodeLine = (line: string) => {
  const text = cleanLine(line)
  if (!text) return false

  if (/^(public|private|protected|class|interface|enum|package|import)\b/.test(text)) return true
  if (/^@(Override|Transactional|Data|Getter|Setter|Autowired|Resource)\b/.test(text)) return true
  if (/^(if|for|while|switch|try|catch|finally|return|throw|new)\b/.test(text)) return true
  if (/System\.out\.print/.test(text)) return true
  if (/[{};]/.test(text) && /[A-Za-z]/.test(text)) return true
  if (/\w+\s*=\s*.+;?$/.test(text) && /[A-Za-z]/.test(text)) return true
  return false
}

const compressBlankLines = (text: string) => text.replace(/\n{3,}/g, '\n\n').trim()

const buildChapterSupplement = (chapterTitle: string) => {
  if (chapterTitle.includes('基础篇') || chapterTitle.includes('网络')) {
    return `
## 可视化补充
### TCP 建连时序图
\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: SYN
    S->>C: SYN+ACK
    C->>S: ACK
\`\`\`

### Java 示例（Socket）
\`\`\`java
try (Socket socket = new Socket("127.0.0.1", 8080);
     BufferedWriter out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()))) {
    out.write("GET / HTTP/1.1\\r\\nHost: localhost\\r\\n\\r\\n");
    out.flush();
}
\`\`\`
`
  }

  if (chapterTitle.includes('JVM')) {
    return `
## 可视化补充
### JVM 运行时结构图
\`\`\`mermaid
graph TD
    A[JVM Runtime] --> B[Heap]
    A --> C[Method Area]
    A --> D[VM Stack]
    A --> E[PC Register]
    A --> F[Native Method Stack]
\`\`\`

### Java 示例（JVM 参数）
\`\`\`java
// 示例启动参数
// -Xms2g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200
public class App {
    public static void main(String[] args) {
        System.out.println("JVM tuning demo");
    }
}
\`\`\`
`
  }

  if (chapterTitle.includes('多线程')) {
    return `
## 可视化补充
### 线程池任务处理流程
\`\`\`mermaid
flowchart LR
    T[提交任务] --> C{核心线程满?}
    C -- 否 --> W1[创建核心线程执行]
    C -- 是 --> Q{队列满?}
    Q -- 否 --> W2[进入阻塞队列]
    Q -- 是 --> M{可扩容?}
    M -- 是 --> W3[创建非核心线程]
    M -- 否 --> R[执行拒绝策略]
\`\`\`

### Java 示例（ThreadPoolExecutor）
\`\`\`java
ExecutorService pool = new ThreadPoolExecutor(
    4, 8, 60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(100),
    Executors.defaultThreadFactory(),
    new ThreadPoolExecutor.CallerRunsPolicy()
);
pool.submit(() -> System.out.println("task"));
pool.shutdown();
\`\`\`
`
  }

  if (chapterTitle.includes('MySQL')) {
    return `
## 可视化补充
### 事务执行时序
\`\`\`mermaid
sequenceDiagram
    participant App as Application
    participant DB as MySQL
    App->>DB: BEGIN
    App->>DB: UPDATE ...
    App->>DB: INSERT ...
    App->>DB: COMMIT
\`\`\`

### Java 示例（事务模板）
\`\`\`java
@Transactional
public void createOrder(Order order) {
    orderMapper.insert(order);
    stockMapper.decrease(order.getSkuId(), order.getCount());
}
\`\`\`
`
  }

  if (chapterTitle.includes('Redis')) {
    return `
## 可视化补充
### Cache-Aside 架构图
\`\`\`mermaid
flowchart LR
    A[Client] --> B[Redis]
    B -- miss --> C[MySQL]
    C --> B
    B --> A
\`\`\`

### Java 示例（旁路缓存）
\`\`\`java
public User getUser(Long id) {
    String key = "user:" + id;
    User cached = redis.get(key);
    if (cached != null) return cached;
    User dbUser = userMapper.findById(id);
    if (dbUser != null) redis.setex(key, 300, dbUser);
    return dbUser;
}
\`\`\`
`
  }

  return `
## 可视化补充
### 通用系统架构图
\`\`\`mermaid
flowchart LR
    U[User] --> G[Gateway]
    G --> S[Service]
    S --> C[Cache]
    S --> D[Database]
\`\`\`

### Java 示例（分层调用）
\`\`\`java
public class UserController {
    private final UserService userService = new UserService();
    public UserDTO detail(Long id) {
        return userService.find(id);
    }
}
\`\`\`
`
}

export const buildReadableChapterContent = (page: BookChapterPage) => {
  const lines = page.content.split(/\r?\n/)
  const result: string[] = []
  const paragraph: string[] = []
  const codeBuffer: string[] = []
  let inCodeBlock = false

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    result.push(paragraph.join(''))
    result.push('')
    paragraph.length = 0
  }

  const flushCodeBuffer = () => {
    if (codeBuffer.length === 0) return
    flushParagraph()
    result.push('```java')
    result.push(...codeBuffer)
    result.push('```')
    result.push('')
    codeBuffer.length = 0
  }

  if (page.toc.length > 0) {
    result.push('## 本章导读')
    page.toc.slice(0, 10).forEach((item) => result.push(`- ${item}`))
    result.push('')
  }

  lines.forEach((rawLine, index) => {
    const line = cleanLine(rawLine)
    if (!line) {
      flushCodeBuffer()
      flushParagraph()
      return
    }

    if (isNoiseLine(line)) {
      return
    }

    if (line.startsWith('```')) {
      flushCodeBuffer()
      flushParagraph()
      inCodeBlock = !inCodeBlock
      result.push(rawLine)
      return
    }

    if (inCodeBlock) {
      result.push(rawLine)
      return
    }

    if (index === 0 && line.includes('篇')) {
      return
    }

    const numberedMatch = line.match(NUMBERED_RE)
    if (numberedMatch) {
      flushCodeBuffer()
      flushParagraph()
      result.push(`## ${numberedMatch[2].trim()}`)
      result.push('')
      return
    }

    if (isLikelyHeading(line)) {
      flushCodeBuffer()
      flushParagraph()
      result.push(`### ${line}`)
      result.push('')
      return
    }

    if (/^[\-•]/.test(line)) {
      flushCodeBuffer()
      flushParagraph()
      result.push(`- ${line.replace(/^[\-•]\s*/, '')}`)
      return
    }

    if (isJavaCodeLine(line)) {
      codeBuffer.push(rawLine)
      return
    }

    flushCodeBuffer()

    paragraph.push(line)
  })

  flushCodeBuffer()
  flushParagraph()
  result.push(buildChapterSupplement(page.title))
  return compressBlankLines(result.join('\n'))
}

const findDetailStart = (lines: string[]) => {
  const indexes: number[] = []
  lines.forEach((line, index) => {
    if (cleanLine(line) === '一、基础篇') {
      indexes.push(index)
    }
  })
  return indexes.length >= 2 ? indexes[1] : 0
}

export const parseBookToChapterPages = (rawText: string): BookChapterPage[] => {
  const allLines = rawText.split(/\r?\n/)
  const start = findDetailStart(allLines)
  const detailLines = allLines.slice(start)

  const pages: BookChapterPage[] = []
  let currentPart = ''
  let currentTitle = ''
  let currentContent: string[] = []
  let currentToc: string[] = []

  const pushCurrent = () => {
    if (!currentTitle || currentContent.length === 0) {
      return
    }

    const dedupToc = Array.from(new Set(currentToc))
    pages.push({
      id: `chapter-page-${pages.length + 1}`,
      title: currentTitle,
      content: currentContent.join('\n').trim(),
      toc: dedupToc
    })
  }

  detailLines.forEach((rawLine) => {
    const line = cleanLine(rawLine)
    if (!line) {
      if (currentTitle) {
        currentContent.push(rawLine)
      }
      return
    }

    if (PART_RE.test(line)) {
      currentPart = line
      return
    }

    if (BIG_CHAPTER_RE.test(line)) {
      pushCurrent()
      currentTitle = currentPart ? `${currentPart} · ${line}` : line
      currentContent = [line]
      currentToc = []
      return
    }

    if (!currentTitle) {
      return
    }

    currentContent.push(rawLine)

    const numberedMatch = line.match(NUMBERED_RE)
    if (numberedMatch) {
      currentToc.push(numberedMatch[2].trim())
      return
    }

    if (isLikelyHeading(line)) {
      currentToc.push(line)
    }
  })

  pushCurrent()
  return pages
}

export const buildQuestionsFromChapterPages = (pages: BookChapterPage[]): GeneratedQuestion[] => {
  if (pages.length === 0) {
    return []
  }

  const chapterTitles = pages.map((page) => page.title)
  const letters = ['A', 'B', 'C', 'D']
  const questions: GeneratedQuestion[] = []

  pages.forEach((page) => {
    const source = page.toc.length > 0 ? page.toc : [page.title]
    source.forEach((topic) => {
      const shuffled = [page.title, ...chapterTitles.filter((title) => title !== page.title).slice(0, 3)]
      const answerIndex = questions.length % Math.min(4, shuffled.length)
      const correct = shuffled[0]
      shuffled[0] = shuffled[answerIndex]
      shuffled[answerIndex] = correct

      questions.push({
        id: `auto-q-${questions.length + 1}`,
        pointId: `auto-point-${questions.length + 1}`,
        title: `【章节定位】“${topic}”属于哪个大章节？`,
        options: shuffled.map((title, index) => `${letters[index]}. ${title}`),
        answer: letters[answerIndex],
        analysis: `该知识点位于：${page.title}。`
      })
    })
  })

  return questions
}
