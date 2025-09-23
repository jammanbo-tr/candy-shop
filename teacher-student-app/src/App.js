import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TeacherPage from './pages/TeacherPage';
import TeacherPageCopy from './pages/TeacherPageCopy';
import StudentSelectPage from './pages/StudentSelectPage';
import StudentSelectPageCopy from './pages/StudentSelectPageCopy';
import StudentPage from './pages/StudentPage';
import StudentPageCopy from './pages/StudentPageCopy';
import BoardPage from './pages/BoardPage';
import BoardListPage from './pages/BoardListPage';
import AttendancePage from './pages/AttendancePage';
import TetrisPage from './pages/TetrisPage';
import EscapeRoomPage from './pages/EscapeRoomPage';
import ShowPage from './pages/ShowPage';
import FormPage from './pages/FormPage';
import MapPage from './pages/MapPage';
import HistoryPage from './pages/HistoryPage';
import HistoryBoardPage from './pages/HistoryBoardPage';
import KoreanHistoryMindMapPage from './pages/KoreanHistoryMindMapPage';
import MindMapHubPage from './pages/MindMapHubPage';
import LabPage from './pages/LabPage';
import HangangPage from './pages/HangangPage';
import HangangHubPage from './pages/HangangHubPage';
import LearningJournalPage from './pages/LearningJournalPage';
import DataBoardPage from './pages/DataBoardPage';
import WatermelonGamePage from './pages/WatermelonGamePage';
import VillainChaseGame from './components/VillainChaseGame';
import './App.css';

function App() {
  const RouterComponent = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:')
    ? HashRouter
    : BrowserRouter;

  return (
    <RouterComponent>
      <Routes>
        <Route path="/landing" element={<HomePage />} />
        <Route path="/teacher" element={<TeacherPage />} />
        <Route path="/teacher-copy" element={<TeacherPageCopy />} />
        <Route path="/student" element={<StudentSelectPage />} />
        <Route path="/student-copy" element={<StudentSelectPageCopy />} />
        <Route path="/student-copy/:studentId" element={<StudentPageCopy />} />
        <Route path="/student/:studentId" element={<StudentPage />} />
        <Route path="/board/:code" element={<BoardPage />} />
        <Route path="/boards" element={<BoardListPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/tetris" element={<TetrisPage />} />
        <Route path="/room" element={<EscapeRoomPage />} />
        <Route path="/show" element={<ShowPage />} />
        <Route path="/form" element={<FormPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history-board/:boardId" element={<HistoryBoardPage />} />
        <Route path="/mindmap-hub" element={<MindMapHubPage />} />
        <Route path="/korean-history-mindmap" element={<KoreanHistoryMindMapPage />} />
        <Route path="/korean-history-mindmap/:classId" element={<KoreanHistoryMindMapPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/hangang-hub" element={<HangangHubPage />} />
        <Route path="/hangang" element={<HangangPage />} />
        <Route path="/hangang/:classId" element={<HangangPage />} />
        <Route path="/learning-journal" element={<LearningJournalPage />} />
        <Route path="/data-board" element={<DataBoardPage />} />
        <Route path="/watermelon" element={<WatermelonGamePage />} />
        <Route path="/villain-chase" element={<VillainChaseGame />} />
        <Route path="/chase" element={<VillainChaseGame />} />
        <Route path="/" element={<TeacherPage />} />
      </Routes>
    </RouterComponent>
  );
}

export default App;
