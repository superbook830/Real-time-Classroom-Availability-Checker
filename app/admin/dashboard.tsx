import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
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
import BackgroundView from '../../components/BackgroundView';
import CustomModal from '../../components/CustomModal';
import { deleteClassroom, getClassrooms } from '../../services/classroom';

// Updated Filter List to match room types
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

export default function AdminDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // --- MODAL STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  const loadRooms = () => {
    const data = getClassrooms();
    setRooms(data);
    applyFilters(search, selectedFilter, data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
    setRefreshing(false);
  };

  // --- FILTER LOGIC ---
  const applyFilters = (searchText: string, filterType: string, sourceData = rooms) => {
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

    setFilteredRooms(result);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    applyFilters(text, selectedFilter);
  };

  const handleFilterPress = (type: string) => {
    setSelectedFilter(type);
    applyFilters(search, type);
  };

  // --- DELETE LOGIC ---
  const handleDeletePress = (id: number) => {
    setSelectedRoomId(id);
    setModalType('error');
    setModalTitle('Delete Room?');
    setModalMessage('This action cannot be undone and will delete all associated schedules.');
    setModalVisible(true);
  };

  const confirmDelete = () => {
    if (selectedRoomId) {
      deleteClassroom(selectedRoomId);
      loadRooms();
    }
  };

  const renderRoom = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => router.push({
        pathname: '/admin/room-details',
        params: { 
          roomId: item.id, 
          roomName: item.name, 
          roomCapacity: item.capacity, 
          roomType: item.type,
          equipment: item.equipment 
        }
      } as any)}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="meeting-room" size={24} color="#004aad" />
        </View>
        <View>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomDetails}>{item.type} • {item.capacity} Seats</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => router.push({
            pathname: '/admin/add-room',
            params: { 
              id: item.id, 
              name: item.name, 
              capacity: item.capacity, 
              type: item.type,
              status: item.status,
              equipment: item.equipment
            }
          } as any)}
          style={{ marginRight: 12 }}
        >
          <MaterialIcons name="edit" size={22} color="#38b6ff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDeletePress(item.id)}>
          <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <BackgroundView>
      <StatusBar barStyle="light-content" backgroundColor="#004aad" />
      
      {/* Custom Modal */}
      <CustomModal 
        visible={modalVisible}
        type={modalType as any}
        title={modalTitle}
        message={modalMessage}
        actionText="Delete"
        cancelText={modalType === 'error' ? "Cancel" : undefined}
        onClose={() => setModalVisible(false)}
        onAction={confirmDelete}
      />

      {/* --- BOLD HEADER SECTION WITH SEARCH --- */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top', 'left', 'right']}>
          
          {/* Title Row */}
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage Rooms & Schedules</Text>
            </View>
            <TouchableOpacity onPress={() => router.replace('/auth/login' as any)} style={styles.logoutBtn}>
              <MaterialIcons name="logout" size={22} color="#004aad" />
            </TouchableOpacity>
          </View>

          {/* Search Bar (Inside Header) */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={24} color="#38b6ff" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search room number..."
              placeholderTextColor="#8fabc2"
              value={search}
              onChangeText={handleSearch}
            />
          </View>

        </SafeAreaView>
      </View>

      <View style={styles.body}>
        {/* --- FILTER CHIPS --- */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {FILTER_TYPES.map((type) => (
              <TouchableOpacity 
                key={type}
                style={[
                  styles.filterChip, 
                  selectedFilter === type && styles.filterChipActive
                ]}
                onPress={() => handleFilterPress(type)}
              >
                <Text style={[
                  styles.filterText, 
                  selectedFilter === type && styles.filterTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- ROOM LIST --- */}
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoom}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="domain-disabled" size={60} color="#bfdbfe" />
              <Text style={styles.emptyText}>No classrooms found</Text>
              <Text style={styles.emptySubText}>Tap the + button to add one.</Text>
            </View>
          }
        />
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/admin/add-room' as any)}
      >
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>

    </BackgroundView>
  );
}

const styles = StyleSheet.create({
  /* Header Styles */
  headerContainer: { 
    backgroundColor: '#004aad', 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    paddingBottom: 25,
    shadowColor: '#004aad', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10
  },
  headerContent: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 15 
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#dbeafe', opacity: 0.9 },
  logoutBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 14, elevation: 3 },

  /* Search Bar */
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', 
    marginHorizontal: 24, paddingHorizontal: 16, height: 50, 
    borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#002855' },

  body: { flex: 1, marginTop: 15 },

  /* Filter Styles */
  filterContainer: { marginBottom: 10 },
  filterScroll: { paddingHorizontal: 20, paddingBottom: 10 },
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, 
    backgroundColor: 'rgba(255,255,255,0.8)', 
    marginRight: 10, borderWidth: 1, borderColor: '#bfdbfe' 
  },
  filterChipActive: { backgroundColor: '#38b6ff', borderColor: '#38b6ff', elevation: 3 },
  filterText: { color: '#5b7c99', fontWeight: '700', fontSize: 14 },
  filterTextActive: { color: '#ffffff' },

  /* List & Cards */
  listContainer: { padding: 20, paddingBottom: 100 },
  
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 18, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#004aad', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#f0f9ff'
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe',
    justifyContent: 'center', alignItems: 'center'
  },
  roomName: { fontSize: 18, fontWeight: '700', color: '#002855' },
  roomDetails: { fontSize: 14, color: '#5b7c99', marginTop: 2 },
  actions: { flexDirection: 'row' },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#004aad',
    justifyContent: 'center', alignItems: 'center', elevation: 8,
    shadowColor: '#004aad', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8
  },

  /* Empty State */
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#5b7c99' },
  emptySubText: { fontSize: 14, color: '#9ca3af' }
});