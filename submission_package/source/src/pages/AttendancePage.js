import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  AccessTime,
  Add,
  Edit,
  Delete,
  CalendarToday,
  Person,
  Group
} from '@mui/icons-material';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  doc, 
  updateDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';

const AttendancePage = ({ userType, userId, userName }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [newAttendance, setNewAttendance] = useState({
    date: new Date(),
    subject: '',
    studentAttendance: {}
  });

  // 학생 목록 가져오기
  useEffect(() => {
    const studentsQuery = query(collection(db, 'students'), orderBy('name'));
    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const studentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
      
      // 새 출석 데이터 초기화
      const initialAttendance = {};
      studentsList.forEach(student => {
        initialAttendance[student.id] = 'present'; // 기본값: 출석
      });
      setNewAttendance(prev => ({
        ...prev,
        studentAttendance: initialAttendance
      }));
    });

    return unsubscribe;
  }, []);

  // 출석 기록 가져오기
  useEffect(() => {
    let attendanceQuery;
    
    if (userType === 'teacher') {
      // 선생님은 모든 출석 기록을 볼 수 있음
      attendanceQuery = query(
        collection(db, 'attendance'),
        orderBy('date', 'desc')
      );
    } else {
      // 학생은 자신의 출석 기록만 볼 수 있음
      attendanceQuery = query(
        collection(db, 'attendance'),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      }));
      setAttendanceRecords(records);
    });

    return unsubscribe;
  }, [userType, userId]);

  // 출석 기록 생성
  const createAttendanceRecord = async () => {
    try {
      const attendanceData = {
        date: newAttendance.date,
        subject: newAttendance.subject,
        createdBy: userId,
        createdByName: userName,
        createdAt: new Date(),
        studentAttendance: newAttendance.studentAttendance
      };

      await addDoc(collection(db, 'attendance'), attendanceData);
      
      setSnackbar({
        open: true,
        message: '출석 기록이 생성되었습니다!',
        severity: 'success'
      });
      
      setShowCreateDialog(false);
      setNewAttendance({
        date: new Date(),
        subject: '',
        studentAttendance: {}
      });
    } catch (error) {
      console.error('출석 기록 생성 실패:', error);
      setSnackbar({
        open: true,
        message: '출석 기록 생성에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 출석 상태 업데이트
  const updateAttendanceStatus = async (recordId, studentId, status) => {
    try {
      const recordRef = doc(db, 'attendance', recordId);
      const record = attendanceRecords.find(r => r.id === recordId);
      
      const updatedAttendance = {
        ...record.studentAttendance,
        [studentId]: status
      };
      
      await updateDoc(recordRef, {
        studentAttendance: updatedAttendance
      });
      
      setSnackbar({
        open: true,
        message: '출석 상태가 업데이트되었습니다!',
        severity: 'success'
      });
    } catch (error) {
      console.error('출석 상태 업데이트 실패:', error);
      setSnackbar({
        open: true,
        message: '출석 상태 업데이트에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 출석 상태 아이콘
  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle color="success" />;
      case 'absent':
        return <Cancel color="error" />;
      case 'late':
        return <AccessTime color="warning" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  // 출석 상태 색상
  const getAttendanceColor = (status) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'late':
        return 'warning';
      default:
        return 'success';
    }
  };

  // 출석 상태 텍스트
  const getAttendanceText = (status) => {
    switch (status) {
      case 'present':
        return '출석';
      case 'absent':
        return '결석';
      case 'late':
        return '지각';
      default:
        return '출석';
    }
  };

  // 학생별 출석률 계산
  const calculateAttendanceRate = (studentId) => {
    const totalRecords = attendanceRecords.length;
    if (totalRecords === 0) return 0;
    
    const presentCount = attendanceRecords.filter(record => 
      record.studentAttendance[studentId] === 'present'
    ).length;
    
    return Math.round((presentCount / totalRecords) * 100);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday color="primary" />
            출석 관리 시스템
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {userType === 'teacher' ? '학생들의 출석을 관리하고 통계를 확인하세요' : '자신의 출석 현황을 확인하세요'}
          </Typography>
        </Box>

        {userType === 'teacher' && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowCreateDialog(true)}
              sx={{ mb: 2 }}
            >
              출석 기록 생성
            </Button>
          </Box>
        )}

        {/* 출석 통계 카드 */}
        {userType === 'student' && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {calculateAttendanceRate(userId)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    출석률
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Person sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {attendanceRecords.filter(r => r.studentAttendance[userId] === 'present').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    출석 일수
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Cancel sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {attendanceRecords.filter(r => r.studentAttendance[userId] === 'absent').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    결석 일수
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* 출석 기록 테이블 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              출석 기록
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>날짜</TableCell>
                    <TableCell>과목</TableCell>
                    {userType === 'teacher' && <TableCell>생성자</TableCell>}
                    {userType === 'teacher' ? (
                      students.map(student => (
                        <TableCell key={student.id} align="center">
                          {student.name}
                        </TableCell>
                      ))
                    ) : (
                      <TableCell align="center">출석 상태</TableCell>
                    )}
                    {userType === 'teacher' && <TableCell>작업</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.date.toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>{record.subject}</TableCell>
                      {userType === 'teacher' && (
                        <TableCell>{record.createdByName}</TableCell>
                      )}
                      {userType === 'teacher' ? (
                        students.map(student => (
                          <TableCell key={student.id} align="center">
                            <FormControl size="small">
                              <Select
                                value={record.studentAttendance[student.id] || 'present'}
                                onChange={(e) => updateAttendanceStatus(
                                  record.id, 
                                  student.id, 
                                  e.target.value
                                )}
                                sx={{ minWidth: 80 }}
                              >
                                <MenuItem value="present">출석</MenuItem>
                                <MenuItem value="absent">결석</MenuItem>
                                <MenuItem value="late">지각</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                        ))
                      ) : (
                        <TableCell align="center">
                          <Chip
                            icon={getAttendanceIcon(record.studentAttendance[userId])}
                            label={getAttendanceText(record.studentAttendance[userId])}
                            color={getAttendanceColor(record.studentAttendance[userId])}
                            variant="outlined"
                          />
                        </TableCell>
                      )}
                      {userType === 'teacher' && (
                        <TableCell>
                          <Tooltip title="삭제">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (window.confirm('이 출석 기록을 삭제하시겠습니까?')) {
                                  deleteDoc(doc(db, 'attendance', record.id));
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* 출석 기록 생성 Dialog */}
        <Dialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>새 출석 기록 생성</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <DatePicker
                label="날짜"
                value={newAttendance.date}
                onChange={(newDate) => setNewAttendance({
                  ...newAttendance,
                  date: newDate
                })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
              
              <TextField
                label="과목"
                fullWidth
                value={newAttendance.subject}
                onChange={(e) => setNewAttendance({
                  ...newAttendance,
                  subject: e.target.value
                })}
              />

              <Typography variant="h6" sx={{ mt: 2 }}>
                학생별 출석 상태
              </Typography>
              
              <Grid container spacing={2}>
                {students.map(student => (
                  <Grid item xs={12} sm={6} md={4} key={student.id}>
                    <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {student.name}
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={newAttendance.studentAttendance[student.id] || 'present'}
                          onChange={(e) => setNewAttendance({
                            ...newAttendance,
                            studentAttendance: {
                              ...newAttendance.studentAttendance,
                              [student.id]: e.target.value
                            }
                          })}
                        >
                          <MenuItem value="present">출석</MenuItem>
                          <MenuItem value="absent">결석</MenuItem>
                          <MenuItem value="late">지각</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>취소</Button>
            <Button
              onClick={createAttendanceRecord}
              variant="contained"
              disabled={!newAttendance.subject}
            >
              생성
            </Button>
          </DialogActions>
        </Dialog>

        {/* 스낵바 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default AttendancePage; 