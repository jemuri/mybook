import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Docs from './pages/Docs'
import Quiz from './pages/Quiz'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="nav">
          <div className="nav-title">📚 Java面试宝典</div>
          <div className="nav-links">
            <Link to="/" className="nav-link">知识阅读</Link>
            <Link to="/quiz" className="nav-link">刷题练习</Link>
          </div>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Docs />} />
            <Route path="/quiz" element={<Quiz />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
