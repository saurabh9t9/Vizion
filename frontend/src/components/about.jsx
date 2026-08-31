import { ArrowLeft, Code2, ExternalLink, Layers3, Mail, Sparkles } from 'lucide-react'
import profileImage from '../assets/hero.png'
import '../styles/InfoPages.css'

function About({ onNavigate }) {
  return (
    <main className="info-page about-page">
      <header className="info-nav">
        <button className="info-brand" onClick={() => onNavigate('landing')}><span>V</span> VIZION</button>
        <nav aria-label="Primary navigation">
          <button onClick={() => onNavigate('landing')}>HOME</button>
          <button onClick={() => onNavigate('history')}>HISTORY</button>
          <button onClick={() => onNavigate('signals')}>SIGNALS</button>
          <button className="active" onClick={() => onNavigate('about')}>ABOUT</button>
        </nav>
        <span className="info-status">ABOUT / 03</span>
      </header>

      <section className="about-hero">
        <div className="about-avatar"><img src={profileImage} alt="Saurabh Sahani" /></div>
        <div><span className="info-kicker">Building intelligent Systems</span><h1>SAURABH<br /><em>SAHANI</em></h1><span className="info-kicker">AIML ENGINEER | B.Sc. STUDENT | DEVELOPER </span></div>
      </section>

      <section className="about-layout">
        <div className="about-intro">
          <span className="about-label">01 / ABOUT ME</span>
          <h2>Building intelligent systems, one idea at a time.</h2>
          <p>I'm Saurabh Sahani, a second-year B.Sc. student specializing in Computer Science, Mathematics, and Artificial Intelligence & Machine Learning. I enjoy taking a problem that feels abstract and turning it into something people can actually use.</p>
          <p>I learn by building, testing, and refining real projects rather than stopping at theory. My interests move across machine learning, deep learning, computer vision, NLP, and generative AI, while I keep strengthening the engineering and problem-solving skills behind them.</p>
          <p>My long-term goal is to become a strong AI/ML engineer who can build intelligent, useful, and scalable systems.</p>
        </div>
        <div className="about-details"><div><span>IDENTITY</span><strong>AI/ML Engineer<br />2nd Year B.Sc.<br />CS · Mathematics · AI/ML</strong></div><div><span>WORKING STYLE</span><strong>Build first<br />Stay curious<br />Improve continuously</strong></div></div>
      </section>

      <section className="identity-row"><div><strong>2nd Year</strong><span>B.Sc. student</span></div><div><strong>AI/ML</strong><span>Engineer in progress</span></div><div><strong>05+</strong><span>AI & data projects</span></div><div><strong>Always</strong><span>Learning by building</span></div></section>

      <section className="portfolio-section">
        <div className="portfolio-heading"><span className="about-label">02 / WHAT I'VE BUILT</span><h2>Projects where curiosity became something practical.</h2></div>
        <div className="project-grid">
          <article className="project-card project-featured"><div className="project-visual project-visual-pink"><Layers3 size={35} /></div><div className="project-meta"><span>01 / COMPUTER VISION</span><span>VIZION</span></div><h3>Vizion</h3><p>AI-powered visual assistant combining computer vision, object detection, AI/VLM capabilities, and an interactive interface.</p><div className="project-tags"><span>PYTHON</span><span>OPENCV</span><span>REACT</span><span>AI/VLM</span></div></article>
          <article className="project-card"><div className="project-visual project-visual-purple"><div className="project-code-mark">NLP</div></div><div className="project-meta"><span>02 / NLP</span><span>AI SYSTEM</span></div><h3>Resume Screening System</h3><p>AI/NLP system for analysing resumes and screening candidates against relevant criteria.</p><div className="project-tags"><span>PYTHON</span><span>NLP</span><span>SCIKIT-LEARN</span></div></article>
          <article className="project-card"><div className="project-visual project-visual-dark"><div className="project-code-mark">DATA</div></div><div className="project-meta"><span>03 / ANALYTICS</span><span>DASHBOARD</span></div><h3>Sales Analysis Dashboard</h3><p>Exploring sales performance, trends, and business insights.</p><div className="project-tags"><span>NUMPY</span><span>PANDAS</span><span>ML</span></div></article>
          <article className="project-card"><div className="project-visual project-visual-purple"><Sparkles size={35} /></div><div className="project-meta"><span>04 / MACHINE LEARNING</span><span>EDA</span></div><h3>Loan Data Analysis</h3><p>Exploratory data analysis and machine learning-oriented study of loan data and patterns.</p><div className="project-tags"><span>NUMPY</span><span>PANDAS</span><span>ML</span></div></article>
          <article className="project-card"><div className="project-visual project-visual-dark"><div className="project-code-mark">EDA</div></div><div className="project-meta"><span>05 / DATA STORY</span><span>VISUALIZATION</span></div><h3>Forbes Richest Athletes EDA</h3><p>Exploration and visualization of athlete rankings, earnings, and financial data.</p><div className="project-tags"><span>PANDAS</span><span>MATPLOTLIB</span><span>EDA</span></div></article>
        </div>
      </section>

      <section className="craft-section"><div><span className="about-label">03 / WHAT I WORK WITH</span><h2>A growing toolkit for intelligent products.</h2></div><div className="capability-list"><div><span>01</span><strong>AI & machine learning</strong><p>Machine Learning | Deep Learning | Computer Vision | NLP | Generative AI</p></div><div><span>02</span><strong>Engineering</strong><p>Python | C | C++ | JavaScript | React | HTML | CSS | Git | GitHub</p></div><div><span>03</span><strong>Data & platforms</strong><p>NumPy | Pandas | Scikit-learn | TensorFlow | PyTorch | OpenCV </p></div></div></section>

      <section className="about-quote"><span>THE BUILDER'S NOTE</span><blockquote>“The best portfolio is not a list of claims. It is the quality of the things you chose to make.”</blockquote><cite>— VIZION / BUILT WITH INTENT</cite></section>

      <section className="connect-section"><div><span className="about-label">04 / LET'S CONNECT</span><h2>Have an idea worth building?</h2><p>Let's connect and turn it into something useful.</p></div><div className="social-links"><a href="https://www.linkedin.com/in/saurabh-sahani-2839583b0" target="_blank" rel="noreferrer"><ExternalLink size={16} /> LinkedIn</a><a href="https://www.instagram.com/saurabh.x01_/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Instagram</a><a href="https://github.com/saurabh9t9" target="_blank" rel="noreferrer"><Code2 size={16} /> GitHub</a><a href="mailto:25cma019@claretcollege.edu.in"><Mail size={16} /> Email</a></div></section>
      <section className="about-footer"><span>KEEP BUILDING / KEEP LEARNING</span><div><a href="#home" onClick={(event) => { event.preventDefault(); onNavigate('landing') }}><ExternalLink size={16} /> VIZION home</a></div></section>
      <button className="info-back" onClick={() => onNavigate('landing')}><ArrowLeft size={15} /> Return to home</button>
    </main>
  )
}

export default About
