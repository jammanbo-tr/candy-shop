import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TeacherPage from './pages/TeacherPage';
import StudentSelectPage from './pages/StudentSelectPage';
import StudentPage from './pages/StudentPage';
import BoardPage from './pages/BoardPage';
import BoardListPage from './pages/BoardListPage';
import AttendancePage from './pages/AttendancePage';
import TetrisPage from './pages/TetrisPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/landing" element={<HomePage />} />
        <Route path="/teacher" element={<TeacherPage />} />
        <Route path="/student" element={<StudentSelectPage />} />
        <Route path="/student/:studentId" element={<StudentPage />} />
        <Route path="/board/:code" element={<BoardPage />} />
        <Route path="/boards" element={<BoardListPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/tetris" element={<TetrisPage />} />
      </Routes>
    </Router>
  );
}

export default App;
