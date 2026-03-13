import { useState } from 'react'
import questionsData from '../data/questions.json'
import './Quiz.css'
import bookRawText from '../../doc/book.txt?raw'
import { parseBookToChapterPages, buildQuestionsFromChapterPages } from '../utils/bookParser'

interface Question {
  id: string
  pointId: string
  title: string
  options: string[]
  answer: string
  analysis: string
}

const parsedPages = parseBookToChapterPages(bookRawText)
const autoQuestions = buildQuestionsFromChapterPages(parsedPages) as Question[]
const allQuestions = [...(questionsData.questions as Question[]), ...autoQuestions]

const Quiz = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])

  const questions = allQuestions
  const currentQuestion = questions[currentIndex]

  // 选择选项
  const handleSelectOption = (option: string) => {
    if (showResult) return
    setSelectedOption(option)
  }

  // 提交答案
  const handleSubmit = () => {
    if (!selectedOption) return
    setShowResult(true)
    setAnsweredCount(prev => prev + 1)
    if (selectedOption[0] === currentQuestion.answer) {
      setScore(prev => prev + 1)
    } else {
      setWrongQuestions(prev => [...prev, currentQuestion])
    }
  }

  // 下一题
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setShowResult(false)
    }
  }

  // 重新开始
  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setShowResult(false)
    setScore(0)
    setAnsweredCount(0)
    setWrongQuestions([])
  }

  const isLastQuestion = currentIndex === questions.length - 1

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-info">
          <span>题目进度：{currentIndex + 1} / {questions.length}</span>
          <span>得分：{score} / {answeredCount}</span>
          <span>正确率：{answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0}%</span>
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-card">
          <div className="question-title">
            {currentQuestion.title}
          </div>
          <div className="options-list">
            {currentQuestion.options.map((option, index) => (
              <div
                key={index}
                className={`option-item
                  ${selectedOption === option ? 'selected' : ''}
                  ${showResult ? (
                    option[0] === currentQuestion.answer
                      ? 'correct'
                      : selectedOption === option
                        ? 'wrong'
                        : ''
                  ) : ''}
                `}
                onClick={() => handleSelectOption(option)}
              >
                <span className="option-index">{option.split('.')[0]}</span>
                <span className="option-text">{option.split('.')[1]}</span>
                {showResult && option[0] === currentQuestion.answer && (
                  <span className="result-icon correct-icon">✅</span>
                )}
                {showResult && selectedOption === option && option[0] !== currentQuestion.answer && (
                  <span className="result-icon wrong-icon">❌</span>
                )}
              </div>
            ))}
          </div>

          {showResult && (
            <div className="analysis-section">
              <div className="analysis-title">答案解析：</div>
              <div className="analysis-content">{currentQuestion.analysis}</div>
            </div>
          )}

          <div className="actions">
            {!showResult ? (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!selectedOption}
              >
                提交答案
              </button>
            ) : (
              !isLastQuestion && (
                <button className="btn btn-primary" onClick={handleNext}>
                  下一题
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {isLastQuestion && showResult && (
        <div className="result-card">
          <h2>🎉 答题完成！</h2>
          <div className="result-stats">
            <p>总题数：{questions.length}</p>
            <p>答对：{score}</p>
            <p>答错：{answeredCount - score}</p>
            <p>正确率：{Math.round((score / questions.length) * 100)}%</p>
          </div>
          {wrongQuestions.length > 0 && (
            <div className="wrong-questions">
              <h3>❌ 错题列表：</h3>
              {wrongQuestions.map((q, index) => (
                <div key={q.id} className="wrong-item">
                  <p>{index + 1}. {q.title}</p>
                  <p className="correct-answer">正确答案：{q.answer}</p>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleRestart}>
            重新答题
          </button>
        </div>
      )}
    </div>
  )
}

export default Quiz
