import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login.jsx'
import Signup from './Signup.jsx'
import Home from './Home.jsx'
import Dashboard from './Dashboard.jsx'
import CreateBlog from './CreateBlog.jsx'
import EditBlog from './EditBlog.jsx'
import Profile from './Profile.jsx'
import BlogDetails from './BlogDetails.jsx'
import About from './About.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/"                element={<About />} />
        <Route path="/home"            element={<Home />} />
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/create-blog"     element={<CreateBlog />} />
        <Route path="/edit-blog/:id"   element={<EditBlog />} />
        <Route path="/profile"         element={<Profile />} />
        <Route path="/blog/:id"        element={<BlogDetails />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
