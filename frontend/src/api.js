import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

export const login = (credentials) => api.post('/login', credentials)
export const register = (details) => api.post('/register', details)
export const requestPasswordReset = (details) => api.post('/password-reset/request', details)
export const verifyPasswordReset = (details) => api.post('/password-reset/verify', details)
export const completePasswordReset = (details) => api.post('/password-reset/complete', details)
export const deleteAccount = (credentials) => api.delete('/account', { data: credentials })
export const updateProfilePhoto = (profile) => api.put('/account/profile-photo', profile)
export const submitProject = (project) => api.post('/projects', project)
export const getStudentProjects = (studentEmail) => api.get('/projects', { params: { student_email: studentEmail } })
export const deleteStudentProject = (projectId, studentEmail) => api.delete(`/projects/${projectId}`, { params: { student_email: studentEmail } })
export const getStudentApplications = (studentEmail) => api.get('/applications', { params: { student_email: studentEmail } })
export const withdrawApplication = (problemId, studentEmail) => api.delete(`/applications/${problemId}`, { params: { student_email: studentEmail } })
export const getStudentStats = (studentEmail) => api.get('/student-stats', { params: { student_email: studentEmail } })
export const getStudentCompetencies = (studentEmail) => api.get('/competencies', { params: { student_email: studentEmail } })
export const getStudentProfile = (studentEmail) => api.get('/profile', { params: { student_email: studentEmail } })
export const updateStudentProfile = (profile) => api.put('/profile', profile)
export const getCompanyProblems = () => api.get('/company-problems')
export const applyToProblem = (application) => api.post('/apply', application)
export const getPracticeProblems = () => api.get('/practice-problems')
export const evaluatePractice = (submission) => api.post('/practice/evaluate', submission)
export const postCompanyProblem = (problem) => api.post('/company-problems', problem)
export const deleteCompanyProblem = (problemId, companyEmail) => api.delete(`/company-problems/${problemId}`, { params: { company_email: companyEmail } })
export const getCompanyApplications = (companyEmail) => api.get('/applications', { params: { company_email: companyEmail } })
export const getStudents = (filters) => api.get('/students', { params: filters })

export default api
