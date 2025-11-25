import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView, StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomModal from '../../components/CustomModal';
import { addSchedule } from '../../services/schedule';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Data for Time Picker
const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export default function AddSchedule() {
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams(); 

  const [subject, setSubject] = useState('');
  const [professor, setProfessor] = useState('');
  const [day, setDay] = useState('Monday');
  
  // Time State
  const [startTime, setStartTime] = useState('09:00'); // Default
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endTime, setEndTime] = useState('10:30'); // Default
  const [endPeriod, setEndPeriod] = useState('AM');

  // UI States for Modals
  const [showDayPicker, setShowDayPicker] = useState(false);
  
  // Time Picker States
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start'); // Which time are we editing?
  const [pickerStep, setPickerStep] = useState<'hour' | 'minute'>('hour'); // Are we picking hour or minute?
  const [tempHour, setTempHour] = useState('');

  // Alert Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const showModal = (type: 'success' | 'error', title: string, msg: string) => {
    setModalType(type); setModalTitle(title); setModalMessage(msg); setModalVisible(true);
  };

  const openTimePicker = (mode: 'start' | 'end') => {
    setPickerMode(mode);
    setPickerStep('hour'); // Reset to hour selection
    setShowTimePicker(true);
  };

  const handleTimeSelection = (value: string) => {
    if (pickerStep === 'hour') {
      setTempHour(value);
      setPickerStep('minute'); // Move to minute selection
    } else {
      // Minute selected, finalize time
      const finalTime = `${tempHour}:${value}`;
      if (pickerMode === 'start') setStartTime(finalTime);
      else setEndTime(finalTime);
      setShowTimePicker(false);
    }
  };

  const handleSave = async () => {
    if (!subject || !professor || !day || !startTime || !endTime) {
      showModal('error', 'Missing Info', 'Please fill in all fields.');
      return;
    }

    const fullStart = `${startTime} ${startPeriod}`;
    const fullEnd = `${endTime} ${endPeriod}`;

    const result = await addSchedule(Number(roomId), subject, professor, day, fullStart, fullEnd);
    
    if (result.success) {
      showModal('success', 'Class Scheduled!', `Added ${subject} to ${roomName}.`);
    } else {
      showModal('error', 'Conflict Detected', result.message || 'Could not save schedule.');
    }
  };

  const onModalClose = () => {
    setModalVisible(false);
    if (modalType === 'success') router.back();
  };

  const PeriodToggle = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity style={[styles.toggleBtn, value === 'AM' && styles.toggleBtnActive]} onPress={() => onChange('AM')}>
        <Text style={[styles.toggleText, value === 'AM' && styles.toggleTextActive]}>AM</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.toggleBtn, value === 'PM' && styles.toggleBtnActive]} onPress={() => onChange('PM')}>
        <Text style={[styles.toggleText, value === 'PM' && styles.toggleTextActive]}>PM</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#004aad" />
      
      <CustomModal 
        visible={modalVisible} type={modalType} title={modalTitle} message={modalMessage} 
        onClose={() => setModalVisible(false)} onAction={onModalClose} actionText={modalType === 'success' ? "Done" : "Fix It"} 
      />

      {/* --- DAY PICKER MODAL --- */}
      <Modal visible={showDayPicker} transparent={true} animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select Day</Text>
            <FlatList
              data={DAYS_OF_WEEK}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.pickerItem, day === item && styles.pickerItemActive]}
                  onPress={() => { setDay(item); setShowDayPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, day === item && styles.pickerItemTextActive]}>{item}</Text>
                  {day === item && <MaterialIcons name="check" size={20} color="#004aad" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowDayPicker(false)}>
              <Text style={styles.closePickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- TIME PICKER MODAL (New!) --- */}
      <Modal visible={showTimePicker} transparent={true} animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerContainer}>
            <Text style={styles.pickerTitle}>
              Select {pickerStep === 'hour' ? 'Hour' : 'Minute'}
            </Text>
            <View style={styles.gridContainer}>
              {(pickerStep === 'hour' ? HOURS : MINUTES).map((item) => (
                <TouchableOpacity 
                  key={item} 
                  style={styles.timeSlot} 
                  onPress={() => handleTimeSelection(item)}
                >
                  <Text style={styles.timeSlotText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowTimePicker(false)}>
              <Text style={styles.closePickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- HEADER --- */}
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaTop}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#004aad" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Add Class</Text>
            <Text style={styles.headerSubtitle}>For {roomName}</Text>
          </View>
          <View style={{ width: 40 }} /> 
        </View>
      </SafeAreaView>

      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject Code</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="class" size={20} color="#38b6ff" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="e.g. Math 101" placeholderTextColor="#8fabc2" value={subject} onChangeText={setSubject} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Professor</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={20} color="#38b6ff" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="e.g. Dr. Smith" placeholderTextColor="#8fabc2" value={professor} onChangeText={setProfessor} />
            </View>
          </View>

          {/* DAY SELECTOR */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Day of Week</Text>
            <TouchableOpacity 
              style={styles.inputWrapper} 
              onPress={() => setShowDayPicker(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="calendar-today" size={20} color="#38b6ff" style={styles.inputIcon} />
              <Text style={styles.textValue}>{day}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#8fabc2" />
            </TouchableOpacity>
          </View>

          {/* START TIME SELECTOR */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.inputWrapper, { flex: 1 }]}
                onPress={() => openTimePicker('start')}
              >
                <MaterialIcons name="access-time" size={20} color="#38b6ff" style={styles.inputIcon} />
                <Text style={styles.textValue}>{startTime}</Text>
              </TouchableOpacity>
              <PeriodToggle value={startPeriod} onChange={setStartPeriod} />
            </View>
          </View>

          {/* END TIME SELECTOR */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>End Time</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.inputWrapper, { flex: 1 }]}
                onPress={() => openTimePicker('end')}
              >
                <MaterialIcons name="access-time-filled" size={20} color="#38b6ff" style={styles.inputIcon} />
                <Text style={styles.textValue}>{endTime}</Text>
              </TouchableOpacity>
              <PeriodToggle value={endPeriod} onChange={setEndPeriod} />
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
            <Text style={styles.btnText}>Save Schedule</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#004aad' },
  safeAreaTop: { backgroundColor: '#004aad' },
  
  headerContent: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 
  },
  backBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 12, elevation: 3 },
  headerTextContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#dbeafe', opacity: 0.9, marginTop: 2 },

  contentContainer: { 
    flex: 1, backgroundColor: '#e6f2ff', 
    borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' 
  },
  scrollContent: { padding: 24 },

  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, fontWeight: '700', color: '#002855', marginBottom: 8, marginLeft: 4 },
  
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 16, 
    height: 56, paddingHorizontal: 16 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#002855', height: '100%' },
  textValue: { flex: 1, fontSize: 16, color: '#002855', paddingTop: 2 }, 
  
  toggleContainer: { flexDirection: 'row', height: 56, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#bfdbfe' },
  toggleBtn: { width: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  toggleBtnActive: { backgroundColor: '#004aad' },
  toggleText: { fontWeight: '600', color: '#5b7c99' },
  toggleTextActive: { color: '#fff' },

  btnPrimary: { backgroundColor: '#004aad', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#004aad', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  /* Picker Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '60%' },
  timePickerContainer: { width: '85%', backgroundColor: 'white', borderRadius: 24, padding: 20, alignItems: 'center' },
  
  pickerTitle: { fontSize: 20, fontWeight: 'bold', color: '#002855', marginBottom: 20, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f9ff' },
  pickerItemActive: { backgroundColor: '#f0f9ff', borderRadius: 8, paddingHorizontal: 10 },
  pickerItemText: { fontSize: 16, color: '#334155' },
  pickerItemTextActive: { color: '#004aad', fontWeight: '700' },
  
  /* Time Grid */
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 10 },
  timeSlot: { width: 60, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#dbeafe' },
  timeSlotText: { fontSize: 18, fontWeight: '600', color: '#004aad' },

  closePickerBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  closePickerText: { color: '#ef4444', fontSize: 16, fontWeight: '600' }
});