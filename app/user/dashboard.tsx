import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { getClassrooms } from '../../services/classroom';
import { getRoomStatus } from '../../services/status';

// Updated Filter List to match Add Room types
const FILTER_TYPES = [
  'All', 
  'Saved', 
  'Lecture Hall', 
  'Laboratory', 
  'Computer Lab', 
  'Seminar Room', 
  'Auditorium', 
  'Study Hall', 
  'Conference Room'
];

export default function UserDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]); 

  // Load Bookmarks
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_bookmarks');
      if (stored) setBookmarks(JSON.parse(stored));
    } catch (e) { console.error("Failed to load bookmarks"); }
  };

  const toggleBookmark = async (id: number) => {
    let newBookmarks;
    if (bookmarks.includes(id)) {
      newBookmarks = bookmarks.filter(b => b !== id); 
    } else {
      newBookmarks = [...bookmarks, id]; 
    }
    setBookmarks(newBookmarks);
    await AsyncStorage.setItem('user_bookmarks', JSON.stringify(newBookmarks));
    applyFilters(search, selectedFilter, rooms, newBookmarks);
  };

  const loadData = () => {
    const allRooms = getClassrooms();
    const roomsWithStatus = allRooms.map(room => {
      const statusInfo = getRoomStatus(room.id);
      return { ...room, ...statusInfo };
    });
    setRooms(roomsWithStatus);
    applyFilters(search, selectedFilter, roomsWithStatus, bookmarks);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [bookmarks])); 
  useEffect(() => { const interval = setInterval(loadData, 60000); return () => clearInterval(interval); }, []);

  const applyFilters = (searchText: string, filterType: string, sourceData = rooms, currentBookmarks = bookmarks) => {
    let result = sourceData;

    // 1. Filter by Type (Exact match logic or partial include)
    if (filterType === 'Saved') {
      result = result.filter(room => currentBookmarks.includes(room.id));
    } else if (filterType !== 'All') {
      // Use includes to be safe, or === for exact match if preferred
      result = result.filter(room => room.type.toLowerCase().includes(filterType.toLowerCase()));
    }

    // 2. Filter by Search Text
    if (searchText) {
      result = result.filter(room => 
        room.name.toLowerCase().includes(searchText.toLowerCase()) ||
        room.type.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    setFilteredRooms(result);
  };

  const handleSearch = (text: string) => { setSearch(text); applyFilters(text, selectedFilter); };
  const handleFilterPress = (type: string) => { setSelectedFilter(type); applyFilters(search, type); };

  const renderRoom = ({ item }: { item: any }) => {
    const isBookmarked = bookmarks.includes(item.id);

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => router.push({
          pathname: '/user/room-details',
          params: { 
            roomId: item.id, 
            roomName: item.name, 
            roomType: item.type, 
            roomCapacity: item.capacity,
            equipment: item.equipment 
          }
        } as any)} 
      >
        <View style={styles.cardHeader}>
          <View style={styles.roomIdentity}>
            <View style={[styles.iconCircle, { backgroundColor: item.status === 'Available' ? '#ecfdf5' : '#fef2f2' }]}>
              <MaterialIcons 
                name={item.status === 'Available' ? "check-circle" : "do-not-disturb-on"} 
                size={24} 
                color={item.color} 
              />
            </View>
            <View>
              <Text style={styles.roomName}>{item.name}</Text>
              <Text style={styles.roomType}>{item.type}</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => toggleBookmark(item.id)} style={styles.bookmarkBtn}>
            <MaterialIcons 
              name={isBookmarked ? "bookmark" : "bookmark-border"} 
              size={26} 
              color={isBookmarked ? "#f59e0b" : "#cbd5e1"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.statusBadge}>
             <View style={[styles.statusDot, { backgroundColor: item.color }]} />
             <Text style={[styles.statusText, { color: item.color }]}>{item.status}</Text>
          </View>
          <Text style={styles.capacityText}>Cap: {item.capacity}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <BackgroundView>
      <StatusBar barStyle="light-content" backgroundColor="#004aad" />
      
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top', 'left', 'right']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Campus Rooms</Text>
              <Text style={styles.headerSubtitle}>Find your space</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.settingsBtn}>
              <MaterialIcons name="settings" size={24} color="#004aad" />
            </TouchableOpacity>
          </View>

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

        <FlatList
          data={filteredRooms}
          keyExtractor={item => item.id.toString()}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="meeting-room" size={60} color="#bfdbfe" style={{marginBottom: 10}} />
              <Text style={styles.emptyText}>
                {selectedFilter === 'Saved' ? "No bookmarked rooms." : "No rooms found."}
              </Text>
            </View>
          }
        />
      </View>
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
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#dbeafe', opacity: 0.9 },
  settingsBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 14, elevation: 3 },

  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 24, paddingHorizontal: 16, height: 50, 
    borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#002855' },

  body: { flex: 1, marginTop: 15 },

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

  list: { paddingHorizontal: 20, paddingBottom: 40 },
  
  card: { 
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 18, marginBottom: 16, 
    shadowColor: '#004aad', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#f0f9ff'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  roomName: { fontSize: 18, fontWeight: 'bold', color: '#002855' }, 
  roomType: { fontSize: 14, color: '#5b7c99' },
  
  bookmarkBtn: { padding: 5 },
  divider: { height: 1, backgroundColor: '#f0f9ff', marginVertical: 14 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  capacityText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#5b7c99', fontSize: 16, fontWeight: '500' }
});