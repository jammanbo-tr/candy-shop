# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive educational gaming platform called "Candy Shop" with multiple interactive experiences. The project consists of:

- **Main Application**: Teacher-student management system with gamification elements
- **Games Collection**: Various mini-games including rhythm games, villain chase, Tetris, and escape rooms
- **Dual Architecture**: Hybrid JavaScript/TypeScript codebase with React frontend and Firebase backend

## Development Commands

### Primary Commands (Root Level)
```bash
# Build the entire project including games integration
npm run build

# Deploy to Firebase hosting
npm run deploy

# Build and deploy in sequence
npm run build-and-deploy
```

### Teacher-Student App Commands
```bash
cd teacher-student-app

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Deploy only
npm run deploy
```

### Firebase Functions Commands
```bash
cd functions

# Lint functions code
npm run lint

# Start Firebase emulator
npm run serve

# Deploy functions only
firebase deploy --only functions
```

## Project Architecture

### Dual Codebase Structure
The project uses a **hybrid architecture** with two main source directories:

1. **`teacher-student-app/src/`** - Legacy JavaScript React app (main application)
2. **`src/`** - Modern TypeScript components (new features)

### Key Directories
- `teacher-student-app/` - Main React application
- `src/` - TypeScript components and modern React features  
- `functions/` - Firebase Cloud Functions (Node.js 22)
- `public/` - Static assets and game resources
- Various game subdirectories (`villain-chase-game/`, etc.)

### Technology Stack
- **Frontend**: React 19.1.0, Material-UI 7.1.0, React Router 7.5.3
- **Backend**: Firebase (Firestore, Auth, Functions, Hosting)
- **Languages**: JavaScript (legacy) + TypeScript (modern)
- **Styling**: Material-UI + Emotion + styled-components
- **Data**: Chart.js, D3.js for visualizations
- **Maps**: Google Maps JavaScript API
- **PDF**: jsPDF + html2canvas for document generation

## Application Structure

### Main Features
1. **Teacher Dashboard** (`TeacherPage.js`) - Student management, rewards system, analytics
2. **Student Interface** (`StudentPage.js`) - Individual student dashboard with gamification
3. **Mini-Games** - Tetris, Escape Room, Villain Chase, Rhythm games
4. **Educational Tools** - Mind maps, history boards, quiz system
5. **Analytics** - Emotion tracking, attendance, performance dashboards

### Key Components
- `StudentCard.js` - Student profile display with level progression
- `EmotionDashboardModal.js` - Emotion tracking and analytics
- `QuizSystem.js` - Interactive quiz functionality
- `CardDrawModal.js` - Gamification reward system
- `VillainChaseGame.js` - Browser-based action game

### Authentication & Data
- **Firebase Auth**: Google OAuth integration
- **Firestore**: Real-time NoSQL database
- **Cloud Functions**: Server-side logic and data processing
- **Storage Rules**: Security rules for data access

## Development Guidelines

### File Naming Conventions
- Legacy components: `.js` (JavaScript)
- New components: `.tsx` (TypeScript React)
- Styles: `.css` files where needed
- Backup files: `.backup.{date}.js` pattern

### Component Architecture
- **Functional Components**: React Hooks-based
- **Real-time Data**: `react-firebase-hooks` for Firestore integration
- **State Management**: useState + useEffect patterns
- **Custom Hooks**: Located in `hooks/` directories

### Firebase Integration
- Real-time listeners for live data updates
- Batch operations for performance
- Security rules enforcement
- Cloud Functions for backend logic

## Build Process

### Production Build
1. Main app builds to `teacher-student-app/build/`
2. Games are copied into build directory
3. Firebase hosting serves from build folder
4. Redirects handle game routing (`/chase` → `/villain-chase-game/`)

### Development Environment
- React dev server runs on `localhost:3000`
- Firebase emulators for backend testing
- Hot reload for development

## Testing

### Test Structure
- Jest + React Testing Library
- Component tests in `teacher-student-app/src/`
- Firebase emulator for integration tests

### Running Tests
```bash
cd teacher-student-app
npm test
```

## Deployment

### Firebase Hosting
- **Production URL**: `https://candy-shop-8394b.web.app/`
- **Staging**: Firebase preview channels available
- **CDN**: Global distribution via Firebase

### Environment Configuration
- Firebase config in `teacher-student-app/src/firebase.js`
- Cloud Functions config in `functions/`
- Hosting rules in `firebase.json`

## Common Development Patterns

### Adding New Features
1. Determine if using TypeScript (new) or JavaScript (legacy)
2. Place in appropriate `src/` directory
3. Follow existing component patterns
4. Integrate with Firebase for data persistence
5. Add routing in `App.js` if needed

### Working with Firestore
- Use `useCollection` for real-time data
- Batch writes for multiple operations
- Follow existing security rule patterns
- Handle loading and error states

### Game Integration
- Games are standalone HTML/JS modules
- Integrated via build process copying
- Routing handled by Firebase hosting redirects
- Shared assets in `public/` directory

## Performance Considerations

### Bundle Optimization
- Code splitting via React.lazy() where implemented
- Material-UI tree shaking
- Image optimization (PNG/WebP)
- Firebase bundle size management

### Target Devices
- **Primary**: Desktop/laptop (1920×1080+)
- **Secondary**: Tablets (768px+) and mobile
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Notes for AI Development

- **Dual Architecture**: Always check which source directory (`src/` vs `teacher-student-app/src/`) when modifying files
- **Firebase Dependency**: All data operations require Firebase integration
- **Real-time Features**: Most components expect live data updates
- **Gamification Elements**: Student progression, levels, rewards are core features
- **Educational Context**: Features designed for classroom management and student engagement