import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  Send,
  Close,
  Circle,
  CheckCircle,
  Warning,
  Info,
  Error
} from '@mui/icons-material';
import { collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const NotificationSystem = ({ userType, userId, userName }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 새 알림 작성용 state
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info', // info, success, warning, error
    targetType: 'all', // all, specific
    targetStudents: []
  });

  const [students, setStudents] = useState([]);

  // 학생 목록 가져오기 (선생님인 경우)
  useEffect(() => {
    if (userType === 'teacher') {
      const studentsQuery = query(collection(db, 'students'), orderBy('name'));
      const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
        const studentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsList);
      });
      return unsubscribe;
    }
  }, [userType]);

  // 알림 목록 가져오기
  useEffect(() => {
    let notificationsQuery;
    
    if (userType === 'teacher') {
      // 선생님은 자신이 보낸 알림들을 볼 수 있음
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('senderId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // 학생은 자신에게 온 알림들을 볼 수 있음
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('recipients', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsList);
      
      // 읽지 않은 알림 개수 계산 (학생인 경우)
      if (userType === 'student') {
        const unread = notificationsList.filter(notification => 
          !notification.readBy || !notification.readBy.includes(userId)
        );
        setUnreadCount(unread.length);
      }
    });

    return unsubscribe;
  }, [userType, userId]);

  // 알림 전송
  const sendNotification = async () => {
    try {
      let recipients = [];
      
      if (newNotification.targetType === 'all') {
        recipients = students.map(student => student.id);
      } else {
        recipients = newNotification.targetStudents;
      }

      const notificationData = {
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        senderId: userId,
        senderName: userName,
        recipients: recipients,
        createdAt: new Date(),
        readBy: []
      };

      await addDoc(collection(db, 'notifications'), notificationData);
      
      setSnackbar({
        open: true,
        message: '알림이 성공적으로 전송되었습니다!',
        severity: 'success'
      });
      
      setShowDialog(false);
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        targetType: 'all',
        targetStudents: []
      });
    } catch (error) {
      console.error('알림 전송 실패:', error);
      setSnackbar({
        open: true,
        message: '알림 전송에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification && (!notification.readBy || !notification.readBy.includes(userId))) {
        const newReadBy = notification.readBy ? [...notification.readBy, userId] : [userId];
        await updateDoc(notificationRef, {
          readBy: newReadBy
        });
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  // 알림 타입별 아이콘
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      default: return <Info color="info" />;
    }
  };

  // 알림 타입별 색상
  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  return (
    <Box>
      {/* 알림 버튼 */}
      <IconButton
        color="inherit"
        onClick={() => setShowNotifications(true)}
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      {/* 선생님인 경우 알림 보내기 버튼 */}
      {userType === 'teacher' && (
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={() => setShowDialog(true)}
          sx={{ ml: 1 }}
        >
          알림 보내기
        </Button>
      )}

      {/* 알림 목록 Dialog */}
      <Dialog 
        open={showNotifications} 
        onClose={() => setShowNotifications(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {userType === 'teacher' ? '보낸 알림' : '받은 알림'}
            </Typography>
            <IconButton onClick={() => setShowNotifications(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {notifications.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              알림이 없습니다.
            </Typography>
          ) : (
            <List>
              {notifications.map((notification) => {
                const isRead = userType === 'student' && 
                  notification.readBy && 
                  notification.readBy.includes(userId);
                
                return (
                  <ListItem
                    key={notification.id}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: isRead ? 'transparent' : '#f5f5f5'
                    }}
                    onClick={() => {
                      if (userType === 'student' && !isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <ListItemIcon>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {notification.title}
                          </Typography>
                          <Chip 
                            label={notification.type} 
                            size="small" 
                            color={getNotificationColor(notification.type)}
                          />
                          {!isRead && userType === 'student' && (
                            <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {userType === 'student' ? 
                              `보낸 사람: ${notification.senderName}` : 
                              `받는 사람: ${notification.recipients.length}명`
                            } • {notification.createdAt?.toDate().toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* 알림 작성 Dialog (선생님용) */}
      <Dialog 
        open={showDialog} 
        onClose={() => setShowDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>새 알림 작성</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
            <TextField
              label="제목"
              fullWidth
              value={newNotification.title}
              onChange={(e) => setNewNotification({
                ...newNotification,
                title: e.target.value
              })}
            />
            
            <TextField
              label="내용"
              fullWidth
              multiline
              rows={4}
              value={newNotification.message}
              onChange={(e) => setNewNotification({
                ...newNotification,
                message: e.target.value
              })}
            />
            
            <FormControl fullWidth>
              <InputLabel>알림 타입</InputLabel>
              <Select
                value={newNotification.type}
                onChange={(e) => setNewNotification({
                  ...newNotification,
                  type: e.target.value
                })}
              >
                <MenuItem value="info">정보</MenuItem>
                <MenuItem value="success">성공</MenuItem>
                <MenuItem value="warning">경고</MenuItem>
                <MenuItem value="error">오류</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>대상</InputLabel>
              <Select
                value={newNotification.targetType}
                onChange={(e) => setNewNotification({
                  ...newNotification,
                  targetType: e.target.value
                })}
              >
                <MenuItem value="all">모든 학생</MenuItem>
                <MenuItem value="specific">특정 학생</MenuItem>
              </Select>
            </FormControl>
            
            {newNotification.targetType === 'specific' && (
              <FormControl fullWidth>
                <InputLabel>학생 선택</InputLabel>
                <Select
                  multiple
                  value={newNotification.targetStudents}
                  onChange={(e) => setNewNotification({
                    ...newNotification,
                    targetStudents: e.target.value
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const student = students.find(s => s.id === value);
                        return <Chip key={value} label={student?.name || value} />;
                      })}
                    </Box>
                  )}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>취소</Button>
          <Button 
            onClick={sendNotification} 
            variant="contained"
            disabled={!newNotification.title || !newNotification.message}
          >
            전송
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
    </Box>
  );
};

export default NotificationSystem; 