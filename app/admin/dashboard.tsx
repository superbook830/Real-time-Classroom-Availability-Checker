import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClassActionModal from '../../components/ClassActionModal';
import CustomModal from '../../components/CustomModal';
import WeekCalendar from '../../components/WeekCalendar';
import { parseNaturalQuery, SearchIntent } from '../../services/aiSearch';
import { deleteClassroom, getClassrooms } from '../../services/classroom';
import { deleteSchedule, getSchedulesByDay } from '../../services/schedule';
import { getRoomStatus } from '../../services/status';

const FILTER_TYPES = [
  'All', 
  'Lecture Hall', 
  'Laboratory', 
  'Computer Lab', 
  'Seminar Room', 
  'Auditorium', 
  'Study Hall', 
  'Conference Room'
];

// CONFIGURATION
const START_HOUR = 7; 
const END_HOUR = 18;   
const HOUR_HEIGHT = 100; 
const ROOM_WIDTH = 180;
const HEADER_HEIGHT = 85; // ✅ INCREASED HEIGHT to fit Buttons + Text without distortion

const COLORS = {
  gridLine: '#f0f0f0',
  timeLabel: '#9aa0a6',
  availableBg: '#f0fff4', 
  availableBorder: '#dcfce7',
  occupiedBg: '#ef4444',     
  occupiedBorder: '#b91c1c', 
  occupiedText: '#ffffff',   
  maintenanceBg: '#fff7ed',
  maintenanceText: '#c2410c',
  reservedBg: '#eff6ff',
  reservedText: '#1e40af',
  currentLine: '#ea4335',
  headerBg: '#ffffff',
  headerText: '#1f2937',
  subText: '#6b7280',
  primary: '#004aad'
};

export default function AdminDashboard() {
  const router = useRouter();
  
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);

  const [rooms, setRooms] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const [classModalVisible, setClassModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedRoomForClass, setSelectedRoomForClass] = useState<any>(null);

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    if (today !== 'Saturday' && today !== 'Sunday') setSelectedDay(today);

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(useCallback(() => { loadRooms(); }, [selectedDay]));

  const loadRooms = () => {
    const data = getClassrooms();
    const dataWithStatus = data.map(room => {
      const statusInfo = getRoomStatus(room.id, selectedDay);
      const dailySchedule = getSchedulesByDay(room.id, selectedDay);
      return { ...room, ...statusInfo, dailySchedule };
    });
    setRooms(dataWithStatus);
    applyFilters(search, selectedFilter, dataWithStatus);
  };

  const onRefresh = () => { setRefreshing(true); loadRooms(); setRefreshing(false); };

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12 && modifier === 'AM') hours = 0;
    if (hours !== 12 && modifier === 'PM') hours += 12;
    return hours + minutes / 60;
  };
  
  const applyFilters = (searchText: string, filterType: string, sourceData = rooms, aiIntent: SearchIntent = {}) => {
    let result = sourceData;
    if (filterType !== 'All') {
      result = result.filter(room => room.type.toLowerCase().includes(filterType.toLowerCase()));
    }
    if (searchText) {
      result = result.filter(room => 
        room.name.toLowerCase().includes(searchText.toLowerCase()) || 
        room.type.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (aiIntent.timeStart !== null && aiIntent.timeEnd !== null && aiIntent.timeStart !== undefined) {
      const searchStart = aiIntent.timeStart;
      const searchEnd = aiIntent.timeEnd || searchStart + 1; 
      result = result.filter(room => {
        if (!room.dailySchedule || room.dailySchedule.length === 0) return true;
        const hasConflict = room.dailySchedule.some((sch: any) => {
          const classStart = parseTime(sch.startTime);
          const classEnd = parseTime(sch.endTime);
          return (searchStart < classEnd) && (searchEnd > classStart);
        });
        return !hasConflict;
      });
    }
    if (aiIntent.targetStatus) {
      const targetStatusLower = aiIntent.targetStatus.toLowerCase(); 
      result = result.filter(room => (room.status || 'Available').toLowerCase() === targetStatusLower);
    }
    setFilteredRooms(result);
  };

  const handleSearch = (text: string) => { setSearch(text); applyFilters(text, selectedFilter); };
  const handleFilterPress = (type: string) => { setSelectedFilter(type); applyFilters(search, type); };

  const handleMagicSearch = async () => {
    if (!search.trim()) return;
    setIsAiLoading(true);
    const result = await parseNaturalQuery(search); 
    setIsAiLoading(false);

    if (result) {
      if (result.day) setSelectedDay(result.day);
      let newFilter = selectedFilter;
      if (result.filterType && FILTER_TYPES.includes(result.filterType) || result.filterType === 'All') {
        newFilter = result.filterType;
        setSelectedFilter(newFilter);
      }
      const keyword = result.searchKeyword || '';
      if (keyword) setSearch(keyword); else setSearch('');
      const aiIntent: SearchIntent = {
        timeStart: result.timeStart,
        timeEnd: result.timeEnd,
        targetStatus: result.targetStatus
      };
      applyFilters(keyword, newFilter, rooms, aiIntent);
    } else {
      Alert.alert("AI Error", "Could not understand the query. Please try again.");
    }
  };

  const handleDeleteRoomPress = (id: number) => {
    setSelectedRoomId(id);
    setModalType('error'); 
    setModalTitle('Delete Room?'); 
    setModalMessage('This action cannot be undone.'); 
    setModalVisible(true);
  };

  const confirmDeleteRoom = () => {
    if (selectedRoomId) { deleteClassroom(selectedRoomId); loadRooms(); }
  };

  const handleClassPress = (room: any, scheduleItem: any) => {
    setSelectedRoomForClass(room);
    setSelectedClass({ ...scheduleItem, roomName: room.name });
    setClassModalVisible(true);
  };

  const confirmDeleteClass = () => {
    if (selectedClass) {
      try {
        deleteSchedule(selectedClass.id); 
        setClassModalVisible(false);
        loadRooms();
        Alert.alert("Success", "Class deleted successfully.");
      } catch (e) {
        Alert.alert("Error", "Could not delete class.");
      }
    }
  };

  const triggerEditClass = () => {
    setClassModalVisible(false);
    handleEditClass(selectedRoomForClass, selectedClass);
  };

  const handleAddClassToSlot = (room: any, hour: number) => {
    const startStr = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
    const endStr = `${hour + 1 > 12 ? hour + 1 - 12 : hour + 1}:00 ${hour + 1 >= 12 ? 'PM' : 'AM'}`;
    router.push({ pathname: '/admin/add-schedule', params: { roomId: room.id, roomName: room.name, startTime: startStr, endTime: endStr, day: selectedDay } } as any);
  };

  const handleEditClass = (room: any, scheduleItem: any) => {
    router.push({ pathname: '/admin/add-schedule', params: { roomId: room.id, roomName: room.name, id: scheduleItem.id, subject: scheduleItem.subject, professor: scheduleItem.professor, startTime: scheduleItem.startTime, endTime: scheduleItem.endTime, day: selectedDay } } as any);
  };

  const getRoomIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('computer')) return <MaterialIcons name="computer" size={18} color={COLORS.primary} />;
    if (t.includes('lab')) return <FontAwesome5 name="flask" size={16} color={COLORS.primary} />;
    if (t.includes('lecture')) return <MaterialIcons name="class" size={18} color={COLORS.primary} />;
    return <MaterialIcons name="room" size={18} color={COLORS.primary} />;
  };

  const renderScheduler = () => {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    const currentLineTop = (currentHour - START_HOUR) * HOUR_HEIGHT;
    const showCurrentLine = currentHour >= START_HOUR && currentHour <= END_HOUR;

    return (
      <View style={styles.schedulerContainer}>
        
        {/* FIXED HEADER ROW */}
        <View style={styles.fixedHeaderRow}>
            {/* Top Left Spacer */}
            <View style={styles.timeColumnHeader} /> 
            
            {/* Room Headers */}
            <ScrollView 
                horizontal 
                ref={headerScrollRef} 
                scrollEnabled={false} 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{flexGrow: 1}}
            >
                <View style={styles.roomHeaderRow}>
                    {filteredRooms.map((room) => (
                        <View key={room.id} style={styles.roomHeaderCell}>
                            <View style={styles.headerTopRow}>
                                <View style={styles.roomIconBg}>{getRoomIcon(room.type)}</View>
                                {/* ACTION BUTTONS (Edit/Delete) */}
                                <View style={styles.headerActions}>
                                    <TouchableOpacity onPress={() => router.push({ pathname: '/admin/add-room', params: room } as any)} style={styles.miniIconBtn}>
                                        <MaterialIcons name="edit" size={14} color="#6b7280" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteRoomPress(room.id)} style={styles.miniIconBtn}>
                                        <MaterialIcons name="delete" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => router.push({ pathname: '/admin/room-details', params: { roomId: room.id, roomName: room.name, roomCapacity: room.capacity, roomType: room.type, equipment: room.equipment } } as any)}>
                                <Text style={styles.roomHeaderText} numberOfLines={1}>{room.name}</Text>
                                <Text style={styles.roomCapacityText}>{room.type} • {room.capacity} seats</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>

        {/* SCROLLABLE BODY */}
        <ScrollView 
            style={{ flex: 1 }} 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 80 }} 
        >
            <View style={styles.scrollableBody}>
                {/* Time Labels */}
                <View style={styles.timeColumnBody}> 
                    {hours.map((hour) => (
                        <View key={hour} style={styles.timeLabelContainer}>
                            <Text style={styles.timeLabel}>
                                {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Grid */}
                <ScrollView 
                    horizontal 
                    ref={bodyScrollRef}
                    contentContainerStyle={{flexGrow: 1}} 
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16} 
                    onScroll={(e) => {
                        const x = e.nativeEvent.contentOffset.x;
                        headerScrollRef.current?.scrollTo({ x, animated: false });
                    }}
                >
                    <View style={styles.gridBody}>
                        <View style={styles.gridLinesContainer}>
                            {hours.map((h, i) => (
                                <View key={i} style={styles.gridLine} />
                            ))}
                        </View>
                        
                        <View style={styles.roomColumnsContainer}>
                            {filteredRooms.map((room) => {
                                const isMaintenance = room.status === 'Maintenance';
                                const isReserved = room.status === 'Reserved';
                                const isBlocked = isMaintenance || isReserved;

                                return (
                                    <View key={room.id} style={styles.roomColumn}>
                                         
                                         {!isBlocked && (
                                           <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.availableBg }]}>
                                             {hours.map((h, i) => (
                                               <View key={i} style={{ height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: COLORS.availableBorder, borderStyle: 'dashed' }} />
                                             ))}
                                           </View>
                                         )}

                                         {!isBlocked && hours.map((hour) => (
                                           <TouchableOpacity 
                                              key={hour}
                                              style={[styles.emptySlotClickable, { height: HOUR_HEIGHT }]}
                                              onPress={() => handleAddClassToSlot(room, hour)}
                                              activeOpacity={0.6}
                                           />
                                         ))}

                                         {isMaintenance && (
                                           <View style={styles.maintenanceOverlay}>
                                             <View style={styles.maintenanceBadge}>
                                                <MaterialIcons name="build" size={16} color={COLORS.maintenanceText} />
                                                <Text style={styles.maintenanceText}>Maintenance</Text>
                                             </View>
                                           </View>
                                         )}

                                         {isReserved && (
                                           <View style={styles.reservedOverlay}>
                                             <View style={styles.reservedBadge}>
                                                <MaterialIcons name="lock" size={16} color={COLORS.reservedText} />
                                                <Text style={styles.reservedText}>Reserved</Text>
                                             </View>
                                           </View>
                                         )}

                                         {!isBlocked && room.dailySchedule && room.dailySchedule.map((sch: any, index: number) => {
                                            const start = parseTime(sch.startTime);
                                            const end = parseTime(sch.endTime);
                                            if (start < START_HOUR || start > END_HOUR) return null;
                                            const top = (start - START_HOUR) * HOUR_HEIGHT;
                                            const height = (end - start) * HOUR_HEIGHT;
                                            return (
                                              <TouchableOpacity 
                                                key={index} 
                                                style={[styles.eventBlock, { top: top, height: height }]}
                                                onPress={() => handleClassPress(room, sch)}
                                                activeOpacity={0.9}
                                              >
                                                <View style={styles.eventContent}>
                                                  <Text style={styles.eventTitle} numberOfLines={1}>{sch.subject}</Text>
                                                  <View style={styles.eventDetailRow}>
                                                    <MaterialIcons name="person" size={12} color="rgba(255,255,255,0.9)" />
                                                    <Text style={styles.eventDetailText} numberOfLines={1}>{sch.professor || "TBD"}</Text>
                                                  </View>
                                                  <View style={styles.eventDetailRow}>
                                                     <MaterialIcons name="access-time" size={12} color="rgba(255,255,255,0.8)" />
                                                     <Text style={styles.eventDetailText}>{sch.startTime} - {sch.endTime}</Text>
                                                  </View>
                                                </View>
                                              </TouchableOpacity>
                                            );
                                         })}
                                    </View>
                                );
                            })}
                        </View>
                        {showCurrentLine && (
                          <View style={[styles.currentLine, { top: currentLineTop }]}>
                            <View style={styles.nowBadge}>
                              <Text style={styles.nowText}>NOW</Text>
                            </View>
                          </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#004aad" />
      <CustomModal visible={modalVisible} type={modalType as any} title={modalTitle} message={modalMessage} actionText="Delete" cancelText={modalType === 'error' ? "Cancel" : undefined} onClose={() => setModalVisible(false)} onAction={confirmDeleteRoom} />
      <ClassActionModal visible={classModalVisible} data={selectedClass} onClose={() => setClassModalVisible(false)} onEdit={triggerEditClass} onDelete={confirmDeleteClass} />

      <SafeAreaView edges={['top', 'left', 'right']} style={{flex: 1}}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage Rooms & Schedules</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity onPress={() => router.push('/admin/maintenance-inbox' as any)} style={styles.settingsBtn}>
              <View style={{position:'absolute', top:8, right:8, width:8, height:8, borderRadius:4, backgroundColor:'#ef4444', zIndex:10}} />
              <MaterialIcons name="notifications-none" size={20} color="#004aad" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsBtn}>
              <MaterialIcons name="settings" size={20} color="#004aad" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#38b6ff" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Ask AI (e.g., 'Labs free tomorrow afternoon')" placeholderTextColor="#8fabc2" value={search} onChangeText={handleSearch} />
          <TouchableOpacity onPress={handleMagicSearch} style={{ padding: 8, backgroundColor: '#e0f2fe', borderRadius: 12, marginLeft: 4 }} disabled={isAiLoading}>
            {isAiLoading ? <ActivityIndicator size="small" color="#004aad" /> : <MaterialIcons name="auto-awesome" size={24} color="#004aad" />}
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTER_TYPES.map((type) => (
              <TouchableOpacity key={type} style={[styles.filterChip, selectedFilter === type && styles.filterChipActive]} onPress={() => handleFilterPress(type)}>
                <Text style={[styles.filterText, selectedFilter === type && styles.filterTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <WeekCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />

        <View style={styles.body}>
           {filteredRooms.length > 0 ? renderScheduler() : <View style={styles.emptyState}><MaterialIcons name="domain-disabled" size={60} color="#bfdbfe" /><Text style={styles.emptyText}>No rooms found.</Text></View>}
        </View>
      </SafeAreaView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/admin/add-room' as any)}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#004aad' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#dbeafe', opacity: 0.9 },
  settingsBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 16, marginBottom: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#002855' },
  filterContainer: { marginBottom: 5 },
  filterScroll: { paddingHorizontal: 20, paddingBottom: 5 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 8 },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { color: '#dbeafe', fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#004aad', fontWeight: 'bold' },
  body: { flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  
  schedulerContainer: { flex: 1, flexDirection: 'column' }, 
  
  fixedHeaderRow: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.headerBg, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.gridLine, 
    zIndex: 100 
  },
  
  timeColumnHeader: { 
    width: 60, 
    height: HEADER_HEIGHT, // ✅ Matches new room header height
    borderRightWidth: 1, 
    borderRightColor: COLORS.gridLine, 
    backgroundColor: '#fff', 
    marginTop: 0 
  },
  
  scrollableBody: { 
    flexDirection: 'row', 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: 0 
  },
  
  timeColumnBody: { 
    width: 60, 
    borderRightWidth: 1, 
    borderRightColor: COLORS.gridLine, 
    backgroundColor: '#fff', 
    zIndex: 50, 
    marginTop: 0 
  },

  timeLabelContainer: { height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 8 },
  timeLabel: { fontSize: 11, color: COLORS.timeLabel, fontWeight: '500', transform: [{translateY: 0}] },

  roomHeaderRow: { flexDirection: 'row', backgroundColor: '#fff' },
  
  // ✅ INCREASED HEIGHT TO PREVENT DISTORTION
  roomHeaderCell: { 
    width: ROOM_WIDTH, 
    height: HEADER_HEIGHT, 
    justifyContent: 'center', 
    borderRightWidth: 1, 
    borderRightColor: COLORS.gridLine, 
    paddingHorizontal: 10, 
    paddingVertical: 8 
  },
  
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, width: '100%' },
  roomIconBg: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  
  // ✅ ADDED MISSING ACTION STYLES
  headerActions: { flexDirection: 'row', gap: 4 },
  miniIconBtn: { padding: 4, backgroundColor: '#f3f4f6', borderRadius: 4 },
  
  roomHeaderText: { fontSize: 14, fontWeight: '700', color: COLORS.headerText },
  roomCapacityText: { fontSize: 10, color: COLORS.subText, marginTop: 1 },
  
  gridBody: { position: 'relative' },
  gridLinesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine: { height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: COLORS.gridLine },
  roomColumnsContainer: { flexDirection: 'row' },
  roomColumn: { width: ROOM_WIDTH, borderRightWidth: 1, borderRightColor: COLORS.gridLine, position: 'relative', minHeight: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT },
  
  maintenanceOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.maintenanceBg, justifyContent: 'center', alignItems: 'center', zIndex: 5, opacity: 0.95 },
  maintenanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#fed7aa', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  maintenanceText: { color: COLORS.maintenanceText, fontWeight: '700', fontSize: 12 },

  // RESERVED STATUS STYLES
  reservedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.reservedBg, justifyContent: 'center', alignItems: 'center', zIndex: 5, opacity: 0.95 },
  reservedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#bfdbfe', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  reservedText: { color: COLORS.reservedText, fontWeight: '700', fontSize: 12 },

  emptySlotClickable: { width: '100%', zIndex: 1 },

  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: COLORS.occupiedBg, 
    borderRadius: 8,
    padding: 0,
    zIndex: 2,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.occupiedBorder, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4
  },
  eventContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, justifyContent: 'flex-start', paddingTop: 6 },
  eventTitle: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 1 },
  eventDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  eventDetailText: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '500' },
  
  currentLine: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    height: 2, 
    backgroundColor: COLORS.currentLine, 
    zIndex: 20,
    marginTop: -1 
  },
  nowBadge: { position: 'absolute', left: -40, top: -9, backgroundColor: COLORS.currentLine, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  nowText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#004aad', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#5b7c99' }
});