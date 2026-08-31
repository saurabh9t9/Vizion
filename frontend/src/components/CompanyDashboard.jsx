import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Filter, LogOut, Mail, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { deleteAccount, deleteCompanyProblem, getCompanyApplications, getCompanyProblems, getStudents, postCompanyProblem, updateProfilePhoto } from '../api'
import ProfilePhotoPicker from './ProfilePhotoPicker'
import '../styles/CompanyDashboard.css'

const emptyProblem = { title: '', description: '', skills: '' }

function CompanyDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('vizion-user') || '{}')
  const [problems, setProblems] = useState([])
  const [students, setStudents] = useState([])
  const [applications, setApplications] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [problem, setProblem] = useState(emptyProblem)
  const [filters, setFilters] = useState({ skill: '', interest: '', min_projects: 0 })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(user.profile_photo || null)

  useEffect(() => {
    if (!notice) return undefined
    const timeoutId = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  const loadStudents = async (nextFilters = filters) => {
    try { setStudents((await getStudents(nextFilters)).data.students || []) } catch (err) { setError(err.response?.data?.detail || 'Students could not be loaded.') }
  }
  useEffect(() => {
    Promise.all([getCompanyProblems(), getStudents({ skill: '', interest: '', min_projects: 0 }), getCompanyApplications(user.email)]).then(([problemResult, studentResult, applicationResult]) => {
      setProblems(problemResult.data.problems || [])
      setStudents(studentResult.data.students || [])
      setApplications(applicationResult.data.applications || [])
    }).catch(() => setError('Workspace data could not be loaded.'))
  }, [])
  useEffect(() => {
    const refreshApplications = () => getCompanyApplications(user.email).then((response) => setApplications(response.data.applications || [])).catch(() => {})
    const intervalId = window.setInterval(refreshApplications, 5000)
    return () => window.clearInterval(intervalId)
  }, [user.email])

  const submitProblem = async (event) => {
    event.preventDefault()
    try {
      const response = await postCompanyProblem({ ...problem, company_email: user.email, skills: problem.skills.split(',').map((item) => item.trim()).filter(Boolean) })
      setProblems((current) => [response.data, ...current])
      setProblem(emptyProblem)
      setNotice('Problem statement published to Company needs.')
    } catch (err) { setError(err.response?.data?.detail || 'Problem statement could not be published.') }
  }
  const deleteProblem = async (problemId) => {
    if (!window.confirm('Delete this published brief? Students will no longer see it.')) return
    try {
      await deleteCompanyProblem(problemId, user.email)
      setProblems((current) => current.filter((item) => item.id !== problemId))
      setApplications((current) => current.filter((application) => application.problem_id !== problemId))
      setNotice('Published brief deleted.')
    } catch (err) { setError(err.response?.data?.detail || 'Brief could not be deleted.') }
  }
  const updateFilter = (event) => setFilters({ ...filters, [event.target.name]: event.target.value })
  const signOut = () => { localStorage.removeItem('vizion-user'); navigate('/login', { replace: true }) }
  const deleteUser = async () => {
    if (!window.confirm('Delete your company account permanently? This cannot be undone.')) return
    const password = window.prompt('Enter your password to confirm account deletion.')
    if (password === null) return
    try {
      await deleteAccount({ email: user.email, password, role: user.role })
      localStorage.removeItem('vizion-user')
      navigate('/register', { replace: true })
    } catch (err) { setError(err.response?.data?.detail || 'Account could not be deleted.') }
  }
  const savePhoto = async (nextPhoto) => {
    try {
      const response = await updateProfilePhoto({ email: user.email, role: user.role, profile_photo: nextPhoto })
      setProfilePhoto(response.data.user.profile_photo)
      localStorage.setItem('vizion-user', JSON.stringify(response.data.user))
      setNotice(nextPhoto ? 'Profile photo updated.' : 'Profile photo removed.')
    } catch (err) { setError(err.response?.data?.detail || 'Profile photo could not be saved.') }
  }

  return <main className="company-dashboard">
    <header className="company-header"><div className="company-logo"><span>V</span> VIZION / COMPANY</div><div className="company-account"><span className="header-avatar">{profilePhoto ? <img src={profilePhoto} alt="" /> : <Users size={16} />}</span><strong>{user.name || 'Company'}</strong><button type="button" onClick={signOut}><LogOut size={15} /> Logout</button><button type="button" className="company-danger" onClick={deleteUser}><Trash2 size={15} /> Delete account</button></div></header>
    <div className="company-content">
      <div className="company-intro"><div><p className="company-kicker">COMPANY WORKSPACE</p><h1>Turn a real need into shared work.</h1><p>Publish practical briefs and discover students whose work fits the challenge.</p></div><Users size={42} /></div>
      <section className="company-panel company-profile-panel"><div><p className="company-kicker">COMPANY PROFILE</p><h2>Add a profile photo</h2></div><ProfilePhotoPicker photo={profilePhoto} name={user.name} onChange={savePhoto} /></section>
      {notice && <p className="company-notice">{notice}</p>}{error && <p className="company-error">{error}</p>}
      <div className="company-grid">
        <section className="company-panel"><div className="panel-heading"><div><p className="company-kicker">01 / PUBLISH</p><h2>Post a problem statement</h2></div><Plus size={22} /></div>
          <form className="company-form" onSubmit={submitProblem}><label>Title<input value={problem.title} onChange={(e) => setProblem({ ...problem, title: e.target.value })} placeholder="What should students solve?" required /></label><label>Context and expected outcome<textarea value={problem.description} onChange={(e) => setProblem({ ...problem, description: e.target.value })} placeholder="Describe the problem, constraints, and what useful work looks like." minLength="10" required /></label><label>Skills, comma separated<input value={problem.skills} onChange={(e) => setProblem({ ...problem, skills: e.target.value })} placeholder="React, SQL, Product" /></label><button className="company-primary"><BriefcaseBusiness size={16} /> Publish brief</button></form>
        </section>
        <section className="company-panel"><div className="panel-heading"><div><p className="company-kicker">02 / DISCOVER</p><h2>Find student users</h2></div><Search size={22} /></div>
          <form className="filter-form" onSubmit={(e) => { e.preventDefault(); loadStudents() }}><label>Skill<input name="skill" value={filters.skill} onChange={updateFilter} placeholder="e.g. React" /></label><label>Interest<input name="interest" value={filters.interest} onChange={updateFilter} placeholder="e.g. Data science" /></label><label>Projects<select name="min_projects" value={filters.min_projects} onChange={updateFilter}><option value="0">Any number</option><option value="1">1+ project</option><option value="2">2+ projects</option><option value="3">3+ projects</option></select></label><button className="company-primary"><Filter size={16} /> Apply filters</button></form>
          <div className="student-results">{students.length ? students.map((student) => <button className="student-result" type="button" key={student.email} onClick={() => setSelectedStudent(student)}><span className="student-avatar">{student.profile_photo ? <img src={student.profile_photo} alt="" /> : student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.projects} {student.projects === 1 ? 'project' : 'projects'} / {student.skills.slice(0, 2).join(', ') || 'Skills to be added'}</small></span><Search size={16} /></button>) : <p className="empty-company">No students match these filters yet.</p>}</div>
        </section>
      </div>
      <section className="company-panel published-panel"><div className="panel-heading"><div><p className="company-kicker">LIVE ON THE NETWORK</p><h2>Your published briefs</h2></div><span>{problems.filter((item) => item.company_email === user.email).length} briefs</span></div><div className="published-list">{problems.filter((item) => item.company_email === user.email).map((item) => <article key={item.id}><div><strong>{item.title}</strong><p>{item.description}</p></div><div className="published-actions"><div className="brief-skills">{item.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><button className="delete-brief" type="button" onClick={() => deleteProblem(item.id)} aria-label={`Delete ${item.title}`} title="Delete brief"><Trash2 size={16} /></button></div></article>)}{!problems.some((item) => item.company_email === user.email) && <p className="empty-company">Your published problem statements will appear here.</p>}</div></section>
      <section className="company-panel applicants-panel"><div className="panel-heading"><div><p className="company-kicker">RESPONSES</p><h2>Students who applied</h2></div><span>{applications.length} applicants</span></div><div className="applicant-list">{applications.length ? applications.map((application) => <button className="applicant-row" type="button" key={application.id} onClick={() => setSelectedStudent({ name: application.student_name, email: application.student_email, profile_photo: application.profile_photo, skills: application.skills, interests: application.interests, projects: application.projects, project_list: application.project_list || [] })}><span className="student-avatar">{application.profile_photo ? <img src={application.profile_photo} alt="" /> : application.student_name.slice(0, 1).toUpperCase()}</span><span><strong>{application.student_name}</strong><small>Applied for {application.problem_title}</small></span><span className="applicant-date">{new Date(application.created_at).toLocaleDateString()}</span><Search size={16} /></button>) : <p className="empty-company">Student applications for your briefs will appear here.</p>}</div></section>
    </div>
    {selectedStudent && <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
  </main>
}

function StudentProfileModal({ student, onClose }) {
  return <div className="profile-overlay" role="presentation" onClick={onClose}>
    <section className="student-profile" role="dialog" aria-modal="true" aria-label="Student profile" onClick={(event) => event.stopPropagation()}>
      <button className="close-profile" type="button" onClick={onClose} aria-label="Close profile"><X size={18} /></button>
      <span className="large-avatar">{student.profile_photo ? <img src={student.profile_photo} alt={`${student.name} profile`} /> : student.name.slice(0, 1).toUpperCase()}</span>
      <p className="company-kicker">STUDENT PROFILE</p>
      <h2>{student.name}</h2>
      <a href={`mailto:${student.email}`}><Mail size={15} />{student.email}</a>
      <div className="profile-stats"><strong>{student.projects}<small>Projects done</small></strong><strong>{student.skills.length}<small>Skills</small></strong></div>
      <h3>Projects</h3>
      <div className="student-project-list">{student.project_list?.length ? student.project_list.map((project) => <a key={project.id} href={project.github_url} target="_blank" rel="noreferrer"><strong>{project.title}</strong><small>{project.career_path} / {project.status}</small></a>) : <small>No projects added yet.</small>}</div>
      <h3>Skills</h3>
      <div className="brief-skills">{student.skills.length ? student.skills.map((skill) => <span key={skill}>{skill}</span>) : <small>Not added yet</small>}</div>
      <h3>Interests</h3>
      <div className="brief-skills">{student.interests.length ? student.interests.map((interest) => <span key={interest}>{interest}</span>) : <small>Not added yet</small>}</div>
    </section>
  </div>
}

export default CompanyDashboard
