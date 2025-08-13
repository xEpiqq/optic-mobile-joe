import {
  Image,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  Linking,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Keyboard,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import MapView, { PROVIDER_GOOGLE, Marker, Polygon } from 'react-native-maps';
import { useClusterer } from 'react-native-clusterer';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useSupabase } from '../../contexts/SupabaseContext';
import { GOOGLE_MAPS_API_KEY } from '../../config';
import 'react-native-url-polyfill/auto';
import ReanimatedAnimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIAL_TYPE_KEY = 'CREDENTIAL_TYPE'; 


const { width, height } = Dimensions.get('window');
const MAP_DIMENSIONS = { width, height };
const BUFFER_FACTOR = 1.5; // Reduced buffer factor for better performance with many pins

export default function Tab() {
  const { supabase } = useSupabase();
  const [bigMenu, setBigMenu] = useState(false);
  const [leads, setLeads] = useState([]);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 40.5853,
    longitude: -105.0844,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const mapRef = useRef(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [optimisticLocation, setOptimisticLocation] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [saveMessage, setSaveMessage] = useState('');
  const [region, setRegion] = useState(initialRegion);
  const [isClustering, setIsClustering] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isFiltersModalVisible, setIsFiltersModalVisible] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([0, 1, 2, 3, 4, 5]); // All statuses selected by default
  const [noteText, setNoteText] = useState('');
  const [inlineNoteText, setInlineNoteText] = useState('');
  const [recentNote, setRecentNote] = useState(null);
  const [leadAddress, setLeadAddress] = useState(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isFullNotesModalVisible, setIsFullNotesModalVisible] = useState(false);
  const [allNotes, setAllNotes] = useState([]);
  const [startSaleModal, setStartSaleModal] = useState(false);
  const [dummyRender, setDummyRender] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [managerModeEnabled, setManagerModeEnabled] = useState(false);
  const selectedLead = useRef(null);
  const selectedPlan = useRef(null);
  const showCredentialsRef = useRef(false);
  const uasapRef = useRef('');
  const lastMarkerPressTime = useRef(0);
  const pasapRef = useRef('');
  const ubassRef = useRef('');
  const pbassRef = useRef('');
  const firstName = useRef('');
  const lastName = useRef('');
  const phone = useRef('');
  const email = useRef('');
  const dob = useRef('');
  const asapZip = useRef('');
  const asapAddress = useRef('');
  const asapCity = useRef('');
  const asapUasap = useRef('');
  const asapPasap = useRef('');
  const recentLead = useRef('');
  const noteInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [credentialType, setCredentialType] = useState('ASAP');
  const userTeamRef = useRef('');
  const [teamTerritories, setTeamTerritories] = useState([]);
  const [isTerritoriesModalVisible, setIsTerritoriesModalVisible] = useState(false);
  const [isAddingTerritory, setIsAddingTerritory] = useState(false);
  const [territoryName, setTerritoryName] = useState('');
  const [territoryColor, setTerritoryColor] = useState('#FF0000');
  const [teamUsers, setTeamUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [polygonCoordinates, setPolygonCoordinates] = useState([]);
  const [currentPolygon, setCurrentPolygon] = useState(null);
  const [isSavingTerritory, setIsSavingTerritory] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newLeadButtonPosition, setNewLeadButtonPosition] = useState({ x: 0, y: 0 });
  const [showNewLeadButton, setShowNewLeadButton] = useState(false);
  const [newLeadCoordinate, setNewLeadCoordinate] = useState(null);
  const [newLeadAddress, setNewLeadAddress] = useState('');
  const [newLeadId, setNewLeadId] = useState(null);
  const [editableAddress, setEditableAddress] = useState('');

  const [selectedLeadId, setSelectedLeadId] = useState(null);  // Add this new state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMarkerLongPressing, setIsMarkerLongPressing] = useState(false);
  const [shouldAutoCenter, setShouldAutoCenter] = useState(true); // Track if we should auto-center on location
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Drawer states
  const drawerTranslateY = useSharedValue(0);
  const keyboardHeightShared = useSharedValue(0); // Shared value for keyboard height
  const drawerHeight = height * 0.8; // Maximum drawer height
  const COLLAPSED_HEIGHT = 280; // Collapsed drawer height 
  const EXPANDED_HEIGHT = drawerHeight; // Fully expanded height
  const [drawerState, setDrawerState] = useState('hidden'); // 'hidden', 'collapsed', 'expanded'

  // Spring config for less bouncy animations
  const springConfig = {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  };

  // Drawer position helper functions
  const animateDrawerTo = (position) => {
    'worklet';
    const currentKeyboardHeight = keyboardHeightShared.value;
    
    switch(position) {
      case 'hidden':
        drawerTranslateY.value = withSpring(EXPANDED_HEIGHT, springConfig);
        runOnJS(setDrawerState)('hidden');
        break;
      case 'collapsed':
        const collapsedY = currentKeyboardHeight > 0 
          ? EXPANDED_HEIGHT - COLLAPSED_HEIGHT - currentKeyboardHeight
          : EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
        drawerTranslateY.value = withSpring(collapsedY, springConfig);
        runOnJS(setDrawerState)('collapsed');
        break;
      case 'expanded':
        // Don't adjust for keyboard when expanded - plenty of space visible
        drawerTranslateY.value = withSpring(0, springConfig);
        runOnJS(setDrawerState)('expanded');
        break;
    }
  };

  // Gesture handler for drawer
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startY = drawerTranslateY.value;
      context.keyboardHeight = keyboardHeightShared.value;
      context.startTranslationY = 0;
    },
    onActive: (event, context) => {
      // Only handle vertical gestures that are significant enough
      const absTranslationY = Math.abs(event.translationY);
      const absTranslationX = Math.abs(event.translationX);
      
      // If horizontal movement is more than vertical, ignore (could be scrolling)
      if (absTranslationX > absTranslationY && absTranslationY < 10) {
        return;
      }
      
      // If movement is too small, ignore to allow scrolling
      if (absTranslationY < 5) {
        return;
      }
      
      const newY = context.startY + event.translationY;
      const minY = context.keyboardHeight > 0 ? -context.keyboardHeight : 0;
      // Constrain movement between minY and EXPANDED_HEIGHT
      drawerTranslateY.value = Math.max(minY, Math.min(EXPANDED_HEIGHT, newY));
    },
    onEnd: (event) => {
      const velocity = event.velocityY;
      const currentY = drawerTranslateY.value;
      const kbHeight = keyboardHeightShared.value;
      const absTranslationY = Math.abs(event.translationY);
      
      // If very small movement, don't trigger state change
      if (absTranslationY < 10 && Math.abs(velocity) < 200) {
        return;
      }
      
      // Adjust target positions based on keyboard visibility
      const expandedTarget = 0; // Expanded doesn't adjust for keyboard
      const collapsedTarget = kbHeight > 0 ? EXPANDED_HEIGHT - COLLAPSED_HEIGHT - kbHeight : EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
      
      // Determine which position to snap to based on current position and velocity
      if (velocity > 500) {
        // Fast downward swipe - collapse or hide
        if (currentY < (expandedTarget + collapsedTarget) / 2) {
          animateDrawerTo('collapsed');
        } else {
          animateDrawerTo('hidden');
        }
      } else if (velocity < -500) {
        // Fast upward swipe - expand
        animateDrawerTo('expanded');
      } else {
        // Snap to nearest position based on current Y
        const midPoint1 = (expandedTarget + collapsedTarget) / 2;
        const midPoint2 = (collapsedTarget + EXPANDED_HEIGHT) / 2;
        
        if (currentY < midPoint1) {
          animateDrawerTo('expanded');
        } else if (currentY < midPoint2) {
          animateDrawerTo('collapsed');
        } else {
          animateDrawerTo('hidden');
        }
      }
    },
  });

  // Animated styles for drawer
  const drawerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: drawerTranslateY.value }],
    };
  });

  // Animated styles for backdrop opacity
  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      drawerTranslateY.value,
      [0, EXPANDED_HEIGHT - COLLAPSED_HEIGHT],
      [0.5, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity,
    };
  });

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const height = event.endCoordinates.height;
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
        keyboardHeightShared.value = height; // Update shared value
        
        // Adjust drawer position when keyboard appears
        if (drawerState === 'collapsed') {
          // Move the drawer up by keyboard height to keep it visible
          drawerTranslateY.value = withSpring(EXPANDED_HEIGHT - COLLAPSED_HEIGHT - height, springConfig);
        }
        // Don't adjust if expanded - there's already plenty of visible space
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        keyboardHeightShared.value = 0; // Update shared value
        
        // Restore drawer to original position when keyboard hides
        if (drawerState === 'collapsed') {
          drawerTranslateY.value = withSpring(EXPANDED_HEIGHT - COLLAPSED_HEIGHT, springConfig);
        }
        // Don't need to restore expanded state since it wasn't moved
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, [drawerState, EXPANDED_HEIGHT, COLLAPSED_HEIGHT]);

  // Initialize drawer position
  useEffect(() => {
    // Start with drawer in collapsed position for testing
    drawerTranslateY.value = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
    setDrawerState('collapsed');
  }, []);

  // normal stuff + fetch credential type
  useEffect(() => {
    const loadCredentialType = async () => {
      try {
        const storedType = await AsyncStorage.getItem(CREDENTIAL_TYPE_KEY);
        if (storedType) {
          setCredentialType(storedType);
        }
      } catch (error) {
        console.error('Failed to load credential type:', error);
      }
    };

    loadCredentialType();
    fetchUserType();
    fetchLeads();
    requestLocationPermissionAndFetch();

    return () => {
      if (region) {
        saveMapState(region);
      }
    };
  }, []);

  // Center map on user location once available and map is ready - only on initial load
  useEffect(() => {
    if ((userLocation || optimisticLocation) && isMapReady && mapRef.current && shouldAutoCenter) {
      centerMapOnUserLocation();
      setShouldAutoCenter(false); // Disable auto-centering after first time
    }
  }, [userLocation, optimisticLocation, isMapReady, shouldAutoCenter]);

  useEffect(() => {
    const saveCredentialType = async () => {
      try {
        await AsyncStorage.setItem(CREDENTIAL_TYPE_KEY, credentialType);
      } catch (error) {
        console.error('Failed to save credential type:', error);
      }
    };

    saveCredentialType();
  }, [credentialType]);

  // Refetch leads when manager mode changes
  useEffect(() => {
    if (isManager) {
      if (managerModeEnabled) {
        fetchLeads();
        fetchTeamTerritories();
      } else {
        // When manager mode is disabled, clear team territories and refetch only personal leads
        setTeamTerritories([]);
        fetchLeads();
      }
    }
  }, [managerModeEnabled]);

  useEffect(() => {
    if (isNoteModalVisible && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [isNoteModalVisible]);

  async function fetchUserType() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, team')
        .eq('user_id', userData.user.id)
        .single();

      if (error) {
        console.error('Error fetching user type:', error);
        return;
      }

      if (data) {
        if (data.user_type === 'manager') {
          setIsManager(true);
        }
        
        // Store the team value for later use in fetching team leads and territories
        if (data.team) {
          userTeamRef.current = data.team;
          console.log('User team ID:', data.team);
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching user type:', error);
    }
  }

  // Helper function to chunk arrays for large .in() queries
  function chunkArray(array, chunkSize = 200) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }



  // Update fetchLeads to use the new loading state
  async function fetchLeads() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    
    try {
      // Step 1: Get user territories (this should be fast)
      const { data: userTerritories, error: userTerritoriesError } = await supabase
          .from('users_join_territories')
          .select('territory_id')
          .eq('uid', userData.user.id);
      
      if (userTerritoriesError) {
          console.error('Error fetching user territories:', userTerritoriesError);
        setLeads([]);
          return;
      }
      
      if (!userTerritories || userTerritories.length === 0) {
          console.log('No territories assigned to this user');
          setLeads([]);
          return;
      }
      
      const territoryIds = userTerritories.map(territory => territory.territory_id);
      
      // Step 2: Get all lead IDs in parallel chunks of territories
      const territoryChunkSize = 20; // Process territories in parallel
      const territoryChunks = [];
      for (let i = 0; i < territoryIds.length; i += territoryChunkSize) {
        territoryChunks.push(territoryIds.slice(i, i + territoryChunkSize));
      }
          
      // Fetch lead IDs from all territory chunks in parallel
      const leadIdPromises = territoryChunks.map(async (territoryChunk) => {
        try {
          const { data: territoryLeads, error } = await supabase
              .from('leads_join_territories')
              .select('lead_id')
            .in('territory_id', territoryChunk);
              
          if (error) {
            console.error('Error fetching leads for territory chunk:', error);
            return [];
          }
          
          return territoryLeads?.map(lead => lead.lead_id) || [];
        } catch (error) {
          console.error('Error in territory chunk processing:', error);
          return [];
          }
      });
      
      const leadIdArrays = await Promise.all(leadIdPromises);
      const allLeadIds = [...new Set(leadIdArrays.flat())]; // Remove duplicates
      
      console.log(`Found ${allLeadIds.length} unique leads to fetch`);
      
      if (allLeadIds.length === 0) {
        setLeads([]);
        return;
      }
      
      // Step 3: Fetch recent notes for all leads in parallel
      const notesPromise = (async () => {
        try {
          const { data: allNotes, error } = await supabase
            .from('notes')
            .select('lead_id, note, created_at')
            .in('lead_id', allLeadIds)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching notes:', error);
            return {};
          }
          
          // Group notes by lead_id and get the most recent one for each
          const notesByLead = {};
          if (allNotes) {
            allNotes.forEach(note => {
              if (!notesByLead[note.lead_id]) {
                notesByLead[note.lead_id] = note;
              }
            });
          }
          
          return notesByLead;
        } catch (error) {
          console.error('Error in notes fetching:', error);
          return {};
        }
      })();
      
      // Step 4: Fetch lead data in optimized parallel chunks
      const leadChunkSize = 200; // Smaller chunks for better reliability
      const parallelLimit = 5; // Limit concurrent requests to avoid overwhelming the database
      const allLeads = [];
      let processedLeads = 0;
      
      // Create chunks of lead IDs
      const leadChunks = [];
      for (let i = 0; i < allLeadIds.length; i += leadChunkSize) {
        leadChunks.push(allLeadIds.slice(i, i + leadChunkSize));
      }
      
      // Process chunks with controlled parallelism
      for (let i = 0; i < leadChunks.length; i += parallelLimit) {
        const currentBatch = leadChunks.slice(i, i + parallelLimit);
        
        const batchPromises = currentBatch.map(async (leadChunk, chunkIndex) => {
          try {
            // Add retry logic for individual chunks
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
              try {
                const { data: leads, error } = await supabase
                  .from('leads')
                  .select('id, location, status, knocks, user_id, address, address2')
                  .in('id', leadChunk);
                  
                if (error) {
                  throw error;
                }
                
                processedLeads += leadChunk.length;
                
                return leads || [];
              } catch (chunkError) {
                attempts++;
                console.error(`Attempt ${attempts} failed for lead chunk:`, chunkError);
                
                if (attempts >= maxAttempts) {
                  console.error(`Failed to fetch lead chunk after ${maxAttempts} attempts:`, chunkError);
                  return []; // Return empty array instead of failing completely
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
              }
            }
            
            return [];
          } catch (error) {
            console.error('Unexpected error in lead chunk processing:', error);
            return [];
          }
        });
        
        try {
          const batchResults = await Promise.all(batchPromises);
          allLeads.push(...batchResults.flat());
          
          // Progressive update: Update UI with leads as they come in
          if (allLeads.length > 0 && i % 2 === 0) { // Update every 2 batches
            const formattedLeads = allLeads
              .filter(lead => lead && lead.location?.coordinates)
              .map((lead) => ({
          ...lead,
          latitude: lead.location?.coordinates?.[1],
          longitude: lead.location?.coordinates?.[0],
          isTeamLead: isManager && managerModeEnabled && lead.user_id !== userData.user.id,
          fullAddress: `${lead.address || ''} ${lead.address2 || ''}`.trim()
      }));
      
      setLeads(formattedLeads);
          }
        } catch (batchError) {
          console.error('Error processing batch:', batchError);
          // Continue with next batch instead of failing completely
        }
      }
      
      // Wait for notes to finish loading and merge with lead data
      const notesByLead = await notesPromise;
      
      // Final formatting and filtering
      const formattedLeads = allLeads
        .filter(lead => lead && lead.location?.coordinates) // Filter out invalid leads
        .map((lead) => ({
          ...lead,
          latitude: lead.location?.coordinates?.[1],
          longitude: lead.location?.coordinates?.[0],
          isTeamLead: isManager && managerModeEnabled && lead.user_id !== userData.user.id,
          fullAddress: `${lead.address || ''} ${lead.address2 || ''}`.trim(),
          mostRecentNote: notesByLead[lead.id] || null
        }));
      
      setLeads(formattedLeads);
      console.log(`Successfully loaded ${formattedLeads.length} leads out of ${allLeadIds.length} total`);
      
      // Show success message for large datasets
      if (formattedLeads.length > 1000) {
        console.log(`🎉 Successfully loaded ${formattedLeads.length} leads! App optimized for large datasets.`);
      }
      
    } catch (error) {
      console.error('Unexpected error fetching leads:', error);
      // Don't clear leads on error - keep whatever we have
      if (leads.length === 0) {
        setLeads([]);
      }
    } finally {
      // Cleanup completed
    }
  }

  async function requestLocationPermissionAndFetch() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
    if (status !== 'granted') {
      console.error('Location permission not granted');
      return;
    }

    try {
      const lastKnownLocation = await Location.getLastKnownPositionAsync({});
      if (lastKnownLocation) {
        setOptimisticLocation({
          latitude: lastKnownLocation.coords.latitude,
          longitude: lastKnownLocation.coords.longitude,
        });
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  function toggleCredentialsInputs() {
    showCredentialsRef.current = !showCredentialsRef.current;
    setDummyRender((prev) => !prev);
  }

  async function saveCredentialsToDatabase() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    let updateData = {};
    if (credentialType === 'ASAP') {
      updateData = { uasap: uasapRef.current, pasap: pasapRef.current };
    } else if (credentialType === 'BASS') {
      updateData = { ubass: ubassRef.current, pbass: pbassRef.current };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userData.user.id);

    if (error) return console.error('Error saving credentials:', error);

    setSaveMessage('Credentials saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  }

  async function handleLogout() {
    setIsSettingsModalVisible(false);
    setTimeout(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) return console.error('Logout failed:', error);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        navigation.replace('/(auth)/login');
      } else {
        navigation.navigate('Auth');
      }
    }, 300);
  }

  async function saveMapState(regionToSave) {
    // Implement map state saving logic if needed
  }

  function onRegionChangeComplete(newRegion) {
    setRegion(newRegion);
    saveMapState(newRegion);

    // Optimize clustering based on zoom level and lead count
    const leadCount = leads.length;
    if (leadCount > 5000) {
      // For very large datasets, use more aggressive clustering
      setIsClustering(newRegion.latitudeDelta >= 0.05);
    } else if (leadCount > 1000) {
      // For large datasets, use moderate clustering
      setIsClustering(newRegion.latitudeDelta >= 0.08);
    } else {
      // For smaller datasets, use original clustering
    setIsClustering(newRegion.latitudeDelta >= 0.1);
    }
  }

  function getPinColor(status, isTeamLead) {
    // Base status colors
    const statusColors = {
      0: '#6A0DAD', // New
      1: '#FFD700', // Gone
      2: '#1E90FF', // Later
      3: '#FF6347', // Nope
      4: '#32CD32', // Sold
      5: '#00008B', // Return
    };
    
    // If it's a team lead and manager mode is enabled, use a different color scheme
    if (isTeamLead && isManager && managerModeEnabled) {
      // Lighter versions of the same colors for team leads
      const teamStatusColors = {
        0: '#9370DB', // New - lighter purple
        1: '#FFEC8B', // Gone - lighter yellow
        2: '#87CEFA', // Later - lighter blue
        3: '#FFA07A', // Nope - lighter red
        4: '#90EE90', // Sold - lighter green
        5: '#4169E1', // Return - lighter navy
      };
      return teamStatusColors[status] || teamStatusColors[0];
    }
    
    return statusColors[status] || statusColors[0]; // Default color
  }

  async function updateLeadStatus(leadId, newStatus) {
    // Store the previous status in case we need to revert
    const previousStatus = leads.find(l => l.id === leadId)?.status;
    
    // Optimistic update
    setLeads((prevLeads) =>
      prevLeads.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );

    // Also update the selected lead for immediate UI feedback
    if (selectedLead.current && selectedLead.current.id === leadId) {
      selectedLead.current = { ...selectedLead.current, status: newStatus };
      setDummyRender((prev) => !prev); // Force re-render to update UI immediately
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) {
        // Revert to previous status instead of full refetch
        setLeads((prevLeads) =>
          prevLeads.map((lead) => (lead.id === leadId ? { ...lead, status: previousStatus } : lead))
        );
        // Also revert the selected lead
        if (selectedLead.current && selectedLead.current.id === leadId) {
          selectedLead.current = { ...selectedLead.current, status: previousStatus };
          setDummyRender((prev) => !prev); // Force re-render for revert
        }
        console.error('Error updating lead status:', error);
      }
    } catch (error) {
      // Revert to previous status instead of full refetch
      setLeads((prevLeads) =>
        prevLeads.map((lead) => (lead.id === leadId ? { ...lead, status: previousStatus } : lead))
      );
      // Also revert the selected lead
      if (selectedLead.current && selectedLead.current.id === leadId) {
        selectedLead.current = { ...selectedLead.current, status: previousStatus };
        setDummyRender((prev) => !prev); // Force re-render for revert
      }
      console.error('Unexpected error updating lead status:', error);
    }
  }

  async function fetchMostRecentNote(leadId) {
    const { data, error } = await supabase
      .from('notes')
      .select('note, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data.length) return setRecentNote(null);

    setRecentNote(data[0]);
  }

  function showFullNotesModal(leadId) {
    setIsFullNotesModalVisible(true);
    setIsModalOpen(true);
    fetchAllNotes(leadId);
  }

  async function fetchAllNotes(leadId) {
    // First, fetch the notes
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select('note, created_at, created_by, status')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching all notes:', notesError);
      setAllNotes([]);
      return;
    }

    if (!notesData || notesData.length === 0) {
      setAllNotes([]);
      return;
    }

    // Get unique user IDs from the notes
    const userIds = [...new Set(notesData.map(note => note.created_by))].filter(Boolean);

    if (userIds.length === 0) {
      // If no user IDs, just set the notes without user info
      setAllNotes(notesData.map(note => ({ ...note, profiles: null })));
      return;
    }

    // Fetch user profiles for these IDs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      // Still show notes, but without user info
      setAllNotes(notesData.map(note => ({ ...note, profiles: null })));
      return;
    }

    // Create a map of user_id to profile data
    const profilesMap = {};
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap[profile.user_id] = profile;
      });
    }

    // Combine notes with user profile data
    const notesWithProfiles = notesData.map(note => ({
      ...note,
      profiles: profilesMap[note.created_by] || null
    }));

    setAllNotes(notesWithProfiles);
  }


  async function fetchLeadAddress(leadId) {
    const { data, error } = await supabase
      .from('leads')
      .select('address, address2')
      .eq('id', leadId)
      .single();

    if (error) return console.error('Error fetching address:', error);

    const fullAddress = `${data.address} ${data.address2 || ''}`;
    setLeadAddress(fullAddress.trim());
  }

  function openMaps() {
    if (!selectedLead.current) return console.error('No lead selected.');

    const { latitude, longitude } = selectedLead.current;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${latitude},${longitude}`,
      android: `http://maps.google.com/?q=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch((err) => console.error('Failed to open map:', err));
  }

  async function showMenu(lead, event) {
    console.log('🎯 showMenu called for lead:', lead.id, 'on platform:', Platform.OS);
    
    // Record the time this marker was pressed
    lastMarkerPressTime.current = Date.now();
    
    // Auto-save inline note from previous lead before switching
    if (selectedLead.current && inlineNoteText.trim() !== '') {
      await autoSaveInlineNote();
    }
    
    console.log('🔍 Setting lead data...');
    recentLead.current = lead;
    selectedLead.current = lead; // Set immediately for UI rendering
    setSelectedLeadId(lead.id);
    setInlineNoteText(''); // Clear inline note text for new lead
    // Set address and recent note immediately so they render with the menu
    setLeadAddress(lead.fullAddress || '');
    setRecentNote(lead.mostRecentNote || null);
    
    console.log('✅ Lead data set. selectedLead.current:', selectedLead.current?.id);
    console.log('✅ leadAddress:', lead.fullAddress);
    
    // Show drawer in collapsed state
    animateDrawerTo('collapsed');
    
    // Force a re-render to ensure the menu appears
    setDummyRender(prev => !prev);
  }

  function showBigMenu(lead) {
    if (lead.isTeamLead && isManager && managerModeEnabled) {
      return;
    }
    
    console.log('showBigMenu called for lead:', lead.id);
    
    // Set flag to prevent map interactions from interfering
    setIsMarkerLongPressing(true);
    
    selectedLead.current = lead;
    setSelectedLeadId(lead.id);  // Set the selected lead ID
    
    // Expand drawer to show start sale content instead of opening modal
    animateDrawerTo('expanded');
    setIsModalOpen(true);
    
    // Clear the flag after the drawer is properly expanded
    setTimeout(() => {
      setIsMarkerLongPressing(false);
      console.log('Marker long press flag cleared');
    }, 500);
  }

  async function saveLeadData() {
    if (!recentLead.current?.id) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          first_name: firstName.current.trim(),
          last_name: lastName.current.trim(),
          email: email.current.trim(),
          phone: phone.current.trim(),
          dob: dob.current.trim(),
        })
        .eq('id', recentLead.current.id);

      if (error) {
        console.error('Error saving lead data:', error);
      } else {
        console.log('Lead data saved successfully');
      }
    } catch (error) {
      console.error('Unexpected error saving lead data:', error);
    }
  }

  async function closeBigMenu() {
    // Save the lead data before closing
    await saveLeadData();
    
    // Collapse drawer instead of closing modal
    animateDrawerTo('collapsed');
    setIsModalOpen(false);
    setIsMarkerLongPressing(false); // Clear the marker long press flag
    firstName.current = '';
    lastName.current = '';
    phone.current = '';
    email.current = '';
  }

  async function handleDragStart(lead) {
    recentLead.current = lead;
    
    // Set flag to prevent map interactions during drag operations
    setIsMarkerLongPressing(true);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('first_name, last_name, email, phone, dob')
        .eq('id', lead.id)
        .single();

      if (error) return console.error('Error fetching lead data:', error);

      if (data) {
        firstName.current = data.first_name || '';
        lastName.current = data.last_name || '';
        phone.current = data.phone || '';
        email.current = data.email || '';
        dob.current = data.dob || '';
      }

      setDummyRender((prev) => !prev);
    } catch (error) {
      console.error('Error querying Supabase:', error);
    }
  }

  async function handleDragEnd(lead, event) {
    try {
      const { coordinate } = event.nativeEvent;
      const { latitude, longitude } = coordinate;
      
      console.log(`🎯 Updating lead ${lead.id} location to:`, { latitude, longitude });
      
      // Update the lead's location in the database
      const { error } = await supabase
        .from('leads')
        .update({
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        })
        .eq('id', lead.id);

      if (error) {
        console.error('❌ Error updating lead location:', error);
        Alert.alert('Error', 'Failed to save new lead location. Please try again.');
      } else {
        console.log('✅ Lead location updated successfully');
        
        // Update the local leads state to reflect the change immediately
        setLeads(prevLeads => 
          prevLeads.map(l => 
            l.id === lead.id 
              ? { 
                  ...l, 
                  latitude, 
                  longitude,
                  location: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                  }
                }
              : l
          )
        );
      }
    } catch (error) {
      console.error('❌ Unexpected error updating lead location:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving the lead location.');
    } finally {
      // Clear the marker long press flag after drag operation completes
      setIsMarkerLongPressing(false);
    }
  }

  function handleMarkerLongPress(lead) {
    // Set flag to prevent map long press from triggering +New Lead button
    setIsMarkerLongPressing(true);
    
    // On iOS, long press on a marker often precedes drag operations
    // This handler prevents the map's onLongPress from firing when holding on a marker
    console.log('Marker long press detected for lead:', lead.id);
    
    // Clear the flag after a short delay if no drag operation starts
    setTimeout(() => {
      // Only clear if we're not in a drag operation (which would set its own flag management)
      setIsMarkerLongPressing(false);
    }, 1000);
  }

  async function addNote() {
    console.log('🔍 Starting addNote function...');
    
    // Check both state and ref for selected lead
    const leadId = selectedLeadId || selectedLead.current?.id;
    console.log('📍 Selected lead ID:', leadId);
    
    if (!leadId) {
      console.error('❌ No lead selected for note');
      return;
    }

    const trimmedNote = noteText.trim();
    console.log('📝 Note text length:', trimmedNote.length);
    
    if (trimmedNote === '') {
      console.log('⚠️ Note text is empty, returning');
      return;
    }

    // Store the note locally first
    const newNote = { 
        note: trimmedNote, 
        created_at: new Date().toISOString() 
    };
    
    // Update UI immediately
    setRecentNote(newNote);
    setNoteText('');
    setIsNoteModalVisible(false);

    try {
        // Check authentication
        console.log('🔐 Checking authentication...');
        const { data: userData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ Auth error:', authError);
          Alert.alert('Authentication Error', `Please log in again: ${authError.message}`);
          setRecentNote(null);
          return;
        }
        
        if (!userData?.user) {
          console.error('❌ No user found in session');
          Alert.alert('Authentication Error', 'No user session found. Please log in again.');
          setRecentNote(null);
          return;
        }
        
        console.log('✅ User authenticated:', userData.user.id);
        console.log('📊 Database insert payload:', {
          lead_id: leadId,
          note: trimmedNote.substring(0, 50) + '...', // Log first 50 chars
          created_by: userData.user.id,
          status: selectedLead.current?.status || 0,
        });

        const { data: insertResult, error } = await supabase.from('notes').insert({
            lead_id: leadId,
            note: trimmedNote,
            created_by: userData.user.id,
            created_at: new Date().toISOString(),
            status: selectedLead.current?.status || 0,
        });

        if (error) {
            console.error('❌ Database error adding note:', error);
            console.error('🔍 Error code:', error.code);
            console.error('🔍 Error details:', error.details);
            console.error('🔍 Error hint:', error.hint);
            console.error('🔍 Full error object:', JSON.stringify(error, null, 2));
            
            setRecentNote(null);
            
            // Show specific error messages based on error type
            if (error.code === '42501') {
              Alert.alert('Permission Error', 'You do not have permission to add notes. Please contact your administrator.');
            } else if (error.code === '23503') {
              Alert.alert('Database Error', 'Invalid lead reference. Please refresh and try again.');
            } else {
              Alert.alert('Error', `Failed to save note: ${error.message}`);
            }
        } else {
            console.log('✅ Note saved successfully!');
            console.log('📊 Insert result:', insertResult);
            
            // Update the lead in the leads array with the new note
            const savedNote = { 
              note: trimmedNote, 
              created_at: new Date().toISOString() 
            };
            
            setLeads(prevLeads => 
              prevLeads.map(lead => 
                lead.id === leadId 
                  ? { ...lead, mostRecentNote: savedNote }
                  : lead
              )
            );
            
            // Also update the selectedLead ref if it matches
            if (selectedLead.current && selectedLead.current.id === leadId) {
              selectedLead.current = { ...selectedLead.current, mostRecentNote: savedNote };
            }
        }
    } catch (error) {
        console.error('❌ Unexpected error adding note:', error);
        setRecentNote(null);
        Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
    } finally {
        console.log('🏁 Finished addNote function');
    }
  }

  async function autoSaveInlineNote() {
    console.log('🔍 Starting autoSaveInlineNote function...');
    
    // Check both state and ref for selected lead
    const leadId = selectedLeadId || selectedLead.current?.id;
    console.log('📍 Selected lead ID:', leadId);
    
    if (!leadId) {
      console.log('❌ No lead selected for note');
      return;
    }

    const trimmedNote = inlineNoteText.trim();
    console.log('📝 Inline note text length:', trimmedNote.length);
    
    if (trimmedNote === '') {
      console.log('⚠️ Inline note text is empty, nothing to save');
      return;
    }

    // Store the note locally first
    const newNote = { 
        note: trimmedNote, 
        created_at: new Date().toISOString() 
    };
    
    // Update UI immediately
    setRecentNote(newNote);
    setInlineNoteText('');

    try {
        // Check authentication
        console.log('🔐 Checking authentication...');
        const { data: userData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ Auth error:', authError);
          setRecentNote(null);
          return;
        }
        
        if (!userData?.user) {
          console.error('❌ No user found in session');
          setRecentNote(null);
          return;
        }
        
        console.log('✅ User authenticated:', userData.user.id);
        console.log('📊 Database insert payload:', {
          lead_id: leadId,
          note: trimmedNote.substring(0, 50) + '...', // Log first 50 chars
          created_by: userData.user.id,
          status: selectedLead.current?.status || 0,
        });

        const { data: insertResult, error } = await supabase.from('notes').insert({
            lead_id: leadId,
            note: trimmedNote,
            created_by: userData.user.id,
            created_at: new Date().toISOString(),
            status: selectedLead.current?.status || 0,
        });

        if (error) {
            console.error('❌ Database error adding inline note:', error);
            setRecentNote(null);
        } else {
            console.log('✅ Inline note saved successfully!');
            console.log('📊 Insert result:', insertResult);
            
            // Update the lead in the leads array with the new note
            const savedNote = { 
              note: trimmedNote, 
              created_at: new Date().toISOString() 
            };
            
            setLeads(prevLeads => 
              prevLeads.map(lead => 
                lead.id === leadId 
                  ? { ...lead, mostRecentNote: savedNote }
                  : lead
              )
            );
            
            // Also update the selectedLead ref if it matches
            if (selectedLead.current && selectedLead.current.id === leadId) {
              selectedLead.current = { ...selectedLead.current, mostRecentNote: savedNote };
            }
        }
    } catch (error) {
        console.error('❌ Unexpected error adding inline note:', error);
        setRecentNote(null);
    } finally {
        console.log('🏁 Finished autoSaveInlineNote function');
    }
  }

  function formatDob(dob) {
    if (dob && dob.length === 8 && !dob.includes('/')) {
      return `${dob.slice(0, 2)}/${dob.slice(2, 4)}/${dob.slice(4, 8)}`;
    }
    return dob;
  }

  async function startSale() {
    setStartSaleModal(true);
    // Keep drawer expanded to show the WebView modal

    if (!recentLead.current?.id) return console.error('No recent lead found.');

    const { data, error } = await supabase
      .from('leads')
      .select('address, zip5, city')
      .eq('id', recentLead.current.id)
      .single();

    if (error) return console.error('Error fetching lead information:', error);

    const { data: userData } = await supabase.auth.getUser();
    const { data: asaplogin, error: asapError } = await supabase
      .from('profiles')
      .select('uasap, pasap, ubass, pbass') // Fetch both ASAP and BASS credentials
      .eq('user_id', userData.user.id)
      .single();

    if (asapError) return console.error('Error fetching login info:', asapError);

    if (credentialType === 'ASAP') {
      asapPasap.current = asaplogin.pasap;
      asapUasap.current = asaplogin.uasap;
    } else if (credentialType === 'BASS') {
      asapPasap.current = asaplogin.pbass;
      asapUasap.current = asaplogin.ubass;
    }

    asapAddress.current = data.address;
    asapZip.current = data.zip5;
    asapCity.current = data.city;

    // Save lead data using the new function
    await saveLeadData();
  }

  function injectLogin() {
    setTimeout(() => {
      const username = credentialType === 'ASAP' ? asapUasap.current : asapUasap.current;
      const password = credentialType === 'ASAP' ? asapPasap.current : asapPasap.current;
      const script = `
        document.querySelector('input[name="loginForm$UserName"]').value = "${username}";
        document.querySelector('input[name="loginForm$Password"]').value = "${password}";
        document.querySelector('input[name="loginForm$LoginButton"]').click();
      `;
      this.webref.injectJavaScript(script);
    }, 500);
  }

  function injectNavigate() {
    const script = `
      window.location.href = 'https://${credentialType.toLowerCase()}.docxtract.com/Orders/PrequalOrder.aspx';
    `;
    this.webref.injectJavaScript(script);
  }

  function injectFill() {
    const script = `
      (async function() {
        document.getElementById('ctl00_ContentPlaceHolder1_rdoCustomerType_0').setAttribute('checked', 'checked');
        document.getElementById('ctl00_ContentPlaceHolder1_txtZipCode').value = '${asapZip.current}';
        document.getElementById('ctl00_ContentPlaceHolder1_btnCheckCallRecording').click();

        while (!document.querySelector('input[name="ctl00$ContentPlaceHolder1$txtStreetAddress"]')) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        document.getElementById('ctl00_ContentPlaceHolder1_ddlTypeOfSale').removeAttribute('disabled');
        document.getElementById('ctl00_ContentPlaceHolder1_ddlTypeOfSale').value = Array.from(document.getElementById('ctl00_ContentPlaceHolder1_ddlTypeOfSale').options)
          .find(option => option.text.trim() === 'CUSTOMER PREMISE').value;

        document.querySelector('input[name="ctl00$ContentPlaceHolder1$txtStreetAddress"]').value = '${asapAddress.current}';
        document.querySelector('input[name="ctl00$ContentPlaceHolder1$txtCity"]').value = '${asapCity.current}';
        document.querySelector('input[name="ctl00$ContentPlaceHolder1$txtFirstName"]').value = '${firstName.current}';
        document.querySelector('input[name="ctl00$ContentPlaceHolder1$txtLastName"]').value = '${lastName.current}';
        document.getElementById('ctl00_ContentPlaceHolder1_txtCBR').value = '${phone.current}';

        await new Promise(resolve => setTimeout(resolve, 500));
        document.querySelector('a[onclick="initPage()"]').click();
      })();
    `;
    this.webref.injectJavaScript(script);
  }

  function injectFill2() {
    const script = `
      const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const interval = 100;
          const endTime = Date.now() + timeout;
          const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkInterval);
              resolve(element);
            } else if (Date.now() > endTime) {
              clearInterval(checkInterval);
              reject(new Error('Element not found: ' + selector));
            }
          }, interval);
        });
      };
  
      waitForElement('input[value="radioBroadbandFactsCompleted"]').then(broadbandFactsRadio => {
        broadbandFactsRadio.click();
        setTimeout(() => {
          waitForElement('input[value="Continue"]').then(continueButton => {
            continueButton.click();
          }).catch(error => {
            console.error('Error finding continue button:', error);
          });
        }, 200);
      }).catch(error => {
        console.error('Error finding broadband facts radio:', error);
      });
    `;
    this.webref.injectJavaScript(script);
  }
  

  function injectDob() {
    const formattedDob = formatDob(dob.current);
    const script = `
      const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const interval = 100;
          const endTime = Date.now() + timeout;
          const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkInterval);
              resolve(element);
            } else if (Date.now() > endTime) {
              clearInterval(checkInterval);
              reject(new Error('Element not found: ' + selector));
            }
          }, interval);
        });
      };
  
      waitForElement('input[id="ctl00_ContentPlaceHolder1_RadDOB_dateInput"]').then(dobInput => {
        dobInput.value = '${formattedDob}';
        dobInput.dispatchEvent(new Event('change', { bubbles: true }));
        dobInput.focus();
        setTimeout(() => {
          dobInput.blur();
          const outsideDiv = document.querySelector('div.row-l-c');
          if (outsideDiv) {
            outsideDiv.click();
            const continueButton = document.querySelector('input[name="ctl00$ContentPlaceHolder1$ibtnContinue"]');
            if (continueButton) {
              setTimeout(() => {
                continueButton.click();
              }, 200);
            }
          }
        }, 100);
      }).catch(error => {
        console.error('Error injecting DOB:', error);
      });
    `;
    this.webref.injectJavaScript(script);
  }
  

  function injectOptions() {
    const script = `
      const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const interval = 100;
          const endTime = Date.now() + timeout;
          const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkInterval);
              resolve(element);
            } else if (Date.now() > endTime) {
              clearInterval(checkInterval);
              reject(new Error('Element not found: ' + selector));
            }
          }, interval);
        });
      };
  
      waitForElement('input[value="PX_QTM_WIFI_FREE"]').then(selectWifiOption => {
        selectWifiOption.click();
        setTimeout(() => {
          waitForElement('input[value="PX_QTM_SVC_TECHINST_FREE"]').then(selectTechInstallOption => {
            selectTechInstallOption.click();
            waitForElement('input[name="ctl00$ContentPlaceHolder1$ibtnContinue"]').then(continueButton => {
              setTimeout(() => {
                continueButton.click();
              }, 200);
            }).catch(error => {
              console.error('Error finding continue button:', error);
            });
          }).catch(error => {
            console.error('Error finding tech install option:', error);
          });
        }, 100);
      }).catch(error => {
        console.error('Error finding Wi-Fi option:', error);
      });
    `;
    this.webref.injectJavaScript(script);
  }
  

  function injectEmail() {
    const script = `
      const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const interval = 100;
          const endTime = Date.now() + timeout;
          const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkInterval);
              resolve(element);
            } else if (Date.now() > endTime) {
              clearInterval(checkInterval);
              reject(new Error('Element not found: ' + selector));
            }
          }, interval);
        });
      };
  
      waitForElement('input[name="ctl00$ContentPlaceHolder1$txtContactEmail"]').then(emailInput => {
        emailInput.value = '${email.current}';
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        waitForElement('input[value="radioSMSCapableYes"]').then(smsCapableYesRadio => {
          smsCapableYesRadio.click();
          setTimeout(() => {
            waitForElement('input[name="ctl00$ContentPlaceHolder1$ibtnContinue"]').then(continueButton => {
              continueButton.click();
            }).catch(error => {
              console.error('Error finding continue button:', error);
            });
          }, 200);
        }).catch(error => {
          console.error('Error finding SMS capable option:', error);
        });
      }).catch(error => {
        console.error('Error finding email input:', error);
      });
    `;
    this.webref.injectJavaScript(script);
  }
  

  function injectContinue() {
    const script = `
      const waitForElement = (selector, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const interval = 100;
          const endTime = Date.now() + timeout;
          const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkInterval);
              resolve(element);
            } else if (Date.now() > endTime) {
              clearInterval(checkInterval);
              reject(new Error('Element not found: ' + selector));
            }
          }, interval);
        });
      };
  
      waitForElement('input[name="ctl00$ContentPlaceHolder1$ibtnContinue"]').then(continueButton => {
        continueButton.click();
      }).catch(error => {
        console.error('Error finding continue button:', error);
      });
    `;
    this.webref.injectJavaScript(script);
  }
  

  function injectConfirm() {
    const script = `
      const addressValidationYes = document.querySelector('input[value="radioAddressValidationYes"]');
      if (addressValidationYes) {
        addressValidationYes.click();
        const confirmButton = document.querySelector('input[name="ctl00$ContentPlaceHolder1$btnAddressValidationOK"]');
        if (confirmButton) {
          confirmButton.click();
        }
      }
    `;
    this.webref.injectJavaScript(script);
  }

  async function centerMapOnUserLocation() {
    const locationToUse = userLocation || optimisticLocation;

    if (mapRef.current && locationToUse && region) {
      try {
        // Get current camera to preserve heading and pitch
        const camera = await mapRef.current.getCamera();
        
        // Animate to new center while preserving orientation and zoom
        mapRef.current.animateCamera({
          center: {
            latitude: locationToUse.latitude,
            longitude: locationToUse.longitude,
          },
          heading: camera.heading, // Preserve current orientation
          pitch: camera.pitch, // Preserve current tilt
          zoom: camera.zoom, // Preserve current zoom level
        }, { duration: 1000 });
      } catch (error) {
        // Fallback to animateToRegion if camera method fails
        mapRef.current.animateToRegion({
          latitude: locationToUse.latitude,
          longitude: locationToUse.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        }, 1000);
      }
    } else {
      console.error('User location or map not available');
    }
  }

  function getVisibleLeads() {
    if (!region) return [];
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

    // Optimize buffer based on number of leads
    const leadCount = leads.length;
    let bufferFactor = BUFFER_FACTOR;
    
    if (leadCount > 5000) {
      bufferFactor = 1.2; // Smaller buffer for very large datasets
    } else if (leadCount > 1000) {
      bufferFactor = 1.3; // Moderate buffer for large datasets
    }

    const bufferedLatDelta = latitudeDelta * bufferFactor;
    const bufferedLngDelta = longitudeDelta * bufferFactor;

    const minLat = latitude - bufferedLatDelta / 2;
    const maxLat = latitude + bufferedLatDelta / 2;
    const minLng = longitude - bufferedLngDelta / 2;
    const maxLng = longitude + bufferedLngDelta / 2;

    return leads.filter(
      (lead) =>
        lead.latitude >= minLat &&
        lead.latitude <= maxLat &&
        lead.longitude >= minLng &&
        lead.longitude <= maxLng &&
        selectedStatuses.includes(lead.status) // Filter by selected statuses
    );
  }

  const visibleLeads = useMemo(() => getVisibleLeads(), [leads, region, selectedStatuses]);

  const geoJSONLeads = useMemo(() => {
    return visibleLeads.map((lead) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lead.longitude, lead.latitude],
      },
      properties: {
        id: lead.id,
        status: lead.status,
        knocks: lead.knocks || 0,
        latitude: lead.latitude,
        longitude: lead.longitude,
        isTeamLead: lead.isTeamLead || false,
      },
    }));
  }, [visibleLeads]);

  // Optimize clustering parameters based on dataset size
  const getClusteringOptions = useMemo(() => {
    const leadCount = leads.length;
    
    if (leadCount > 5000) {
      return {
        minZoom: 0,
        maxZoom: 15,
        minPoints: 3, // Cluster more aggressively
        radius: 50,   // Larger radius for more clustering
      };
    } else if (leadCount > 1000) {
      return {
        minZoom: 0,
        maxZoom: 14,
        minPoints: 2,
        radius: 45,
      };
    } else {
      return {
      minZoom: 0,
      maxZoom: 12,
      minPoints: 2,
      radius: 40,
      };
    }
  }, [leads.length]);

  const [clusteredPoints, supercluster] = useClusterer(
    isClustering ? geoJSONLeads : [],
    MAP_DIMENSIONS,
    region,
    getClusteringOptions
  );

  function getStatusMarkerImage(statusIndex) {
    const statusIcons = [
      require('../../assets/images/marker_new_purple_tight.png'),      // New
      require('../../assets/images/marker_gone_gold_tight.png'),       // Gone
      require('../../assets/images/marker_later_dodgerblue_tight.png'), // Later
      require('../../assets/images/marker_nope_tomato_tight.png'),     // Nope
      require('../../assets/images/marker_sold_limegreen_tight.png'),  // Sold
      require('../../assets/images/marker_return_darkblue_tight.png')  // Return
    ];
    return statusIcons[statusIndex] || statusIcons[0];
  }

  function renderDrawer() {
    if (!selectedLead.current) return null;
    
    console.log('🎨 Rendering drawer with state:', drawerState, 'translateY:', drawerTranslateY.value);
    
    const statuses = ['New', 'Gone', 'Later', 'Nope', 'Sold', 'Return'];
    const colors = ['#800080', '#FFD700', '#1E90FF', '#FF6347', '#32CD32', '#00008B'];

    return (
      <>
        {/* Backdrop when drawer is expanded */}
        {drawerState === 'expanded' && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
            activeOpacity={1}
            onPress={() => animateDrawerTo('collapsed')}
          >
            <ReanimatedAnimated.View 
              style={[
                {
                  flex: 1,
                  backgroundColor: 'black',
                },
                backdropAnimatedStyle
              ]}
              pointerEvents="none"
            />
          </TouchableOpacity>
        )}

        {/* Drawer Container */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <ReanimatedAnimated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                height: EXPANDED_HEIGHT,
                minHeight: 300, // Ensure minimum visible height
                backgroundColor: 'white',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
                zIndex: 50,
                bottom: 0,
              },
              drawerAnimatedStyle
            ]}
          >
            {/* Drag Handle */}
            <View className="items-center py-2">
              <View className="w-10 h-1 bg-gray-300 rounded-full" />
            </View>

            <ScrollView 
              className="flex-1 px-4" 
              showsVerticalScrollIndicator={false}
              scrollEnabled={drawerState === 'expanded'} // Only allow scrolling when fully expanded
              bounces={false} // Disable bouncing to prevent interference with drawer gestures
            >
              {/* Lead Menu Content (Collapsed View) */}
              {leadAddress && (
                <View className="mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      {/* Check if this is a new lead being created */}
                      {newLeadId && selectedLead.current?.id === newLeadId ? (
                        <View className="flex-1">
                          <Text className="text-xs text-gray-600 font-medium mb-1">Edit Address:</Text>
                          <TextInput
                            className="border border-gray-300 rounded-lg p-2 text-black font-bold text-base flex-1"
                            value={editableAddress}
                            onChangeText={setEditableAddress}
                            multiline
                            numberOfLines={2}
                            placeholder="Enter lead address"
                          />
                        </View>
                      ) : (
                        <>
                          <Text className="text-black font-bold text-base">{leadAddress}</Text>
                          <TouchableOpacity onPress={openMaps} className="p-2 ml-2">
                            <Image
                              source={require('../../assets/images/directions.png')}
                              className="w-7 h-7 tint-blue-500"
                            />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      {selectedLead.current.isTeamLead && isManager && managerModeEnabled && (
                        <View className="bg-purple-500 rounded-full px-2 py-0.5 mr-3">
                          <Text className="text-white text-xs font-semibold">Team Lead</Text>
                        </View>
                      )}
                      {/* Show Save Lead button for new leads, Start Sale for existing */}
                      {newLeadId && selectedLead.current?.id === newLeadId ? (
                        <TouchableOpacity 
                          onPress={saveNewLead} 
                          className="bg-blue-500 px-3 py-2 rounded-lg"
                        >
                          <Text className="text-white text-sm font-semibold">Save Lead</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          onPress={() => showBigMenu(selectedLead.current)} 
                          className="bg-green-500 px-3 py-2 rounded-lg"
                        >
                          <Text className="text-white text-sm font-semibold">Start Sale</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Status Options Section */}
              <View className="mb-4">
                <View className="flex-row justify-around">
                  {statuses.map((status, index) => {
                    const isCurrentStatus = selectedLead.current.status === index;
                    return (
                      <TouchableOpacity
                        key={index}
                        className={`items-center flex-1 mx-1 py-2 px-1 rounded-lg ${
                          isCurrentStatus ? 'bg-gray-200' : 'bg-transparent'
                        }`}
                        onPress={() => {
                          updateLeadStatus(selectedLead.current.id, index);
                        }}
                      >
                        <Image 
                          source={getStatusMarkerImage(index)}
                          className="h-8 w-8 mb-2"
                          resizeMode="contain"
                        />
                        <Text className="text-sm text-center font-medium text-gray-900">{status}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              {/* Inline Note Input Section */}
              <View className="mb-6">
                <Text className="text-xs text-gray-600 font-medium mb-2">Add Note:</Text>
                <View className="flex-row items-start">
                  <View className="flex-1">
                    <TextInput
                      className="border border-gray-300 rounded-lg p-3 text-base bg-gray-50 min-h-20"
                      multiline
                      placeholder={recentNote ? `Recent Note: ${recentNote.note}` : "Add a note..."}
                      value={inlineNoteText}
                      onChangeText={setInlineNoteText}
                      textAlignVertical="top"
                      onFocus={() => {
                        console.log('📝 Note input focused');
                      }}
                      onBlur={() => {
                        console.log('📝 Note input blurred');
                      }}
                    />
                  </View>
                  {recentNote && (
                    <TouchableOpacity 
                      onPress={() => showFullNotesModal(selectedLead.current.id)}
                      className="ml-2 mt-3"
                    >
                      <Text className="text-blue-500 text-lg font-bold">→</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Start Sale Content (Expanded View) */}
              {drawerState === 'expanded' && (
                <View className="border-t border-gray-200 pt-6">
                  <Text className="text-xl font-bold mb-4 text-center">Start Sale</Text>
                  
                  {/* Lead Info Section */}
                  <View className="mb-6">
                    <Text className="text-lg font-semibold mb-3 text-gray-800">Lead Information</Text>
                    <View className="space-y-3">
                      <TextInput
                        className="bg-gray-50 text-gray-900 placeholder-gray-500 rounded-lg border border-gray-300 py-3 px-4 text-sm"
                        placeholder="First Name"
                        defaultValue={firstName.current}
                        onChangeText={(text) => (firstName.current = text)}
                        placeholderTextColor="#6B7280"
                      />
                      <TextInput
                        className="bg-gray-50 text-gray-900 placeholder-gray-500 rounded-lg border border-gray-300 py-3 px-4 text-sm"
                        placeholder="Last Name"
                        defaultValue={lastName.current}
                        onChangeText={(text) => (lastName.current = text)}
                        placeholderTextColor="#6B7280"
                      />
                      <TextInput
                        className="bg-gray-50 text-gray-900 placeholder-gray-500 rounded-lg border border-gray-300 py-3 px-4 text-sm"
                        placeholder="DOB (MM/DD/YYYY)"
                        defaultValue={formatDob(dob.current)}
                        onChangeText={(text) => (dob.current = text)}
                        keyboardType="numeric"
                        placeholderTextColor="#6B7280"
                        maxLength={10}
                      />
                      <TextInput
                        className="bg-gray-50 text-gray-900 placeholder-gray-500 rounded-lg border border-gray-300 py-3 px-4 text-sm"
                        placeholder="Phone"
                        defaultValue={phone.current}
                        onChangeText={(text) => (phone.current = text)}
                        keyboardType="phone-pad"
                        placeholderTextColor="#6B7280"
                      />
                      <TextInput
                        className="bg-gray-50 text-gray-900 placeholder-gray-500 rounded-lg border border-gray-300 py-3 px-4 text-sm"
                        placeholder="Email"
                        defaultValue={email.current}
                        onChangeText={(text) => (email.current = text)}
                        keyboardType="email-address"
                        placeholderTextColor="#6B7280"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity 
                        onPress={() => deleteLead()}
                        className="self-end p-2"
                      >
                        <Image
                          source={require('../../assets/images/rubbish-bin-wheelie-outline-256.png')}
                          className="w-8 h-8 tint-red-500"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Start Sale Button */}
                  <TouchableOpacity
                    className="bg-blue-600 py-3 rounded-lg mt-6 items-center shadow mb-6"
                    onPress={startSale}
                    accessibilityLabel="Start Sale"
                    accessible={true}
                  >
                    <Text className="text-white text-lg font-semibold">Start Sale</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </ReanimatedAnimated.View>
        </PanGestureHandler>
      </>
    );
  }

  function renderNoteModal() {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isNoteModalVisible}
        onRequestClose={() => {
          setIsNoteModalVisible(false);
          setIsModalOpen(false);
        }}
      >
        <View className="flex-1 bg-white">
          <View className="p-5">
            <Text className="text-2xl font-semibold mb-4 text-center">Add Note</Text>
            <TextInput
              ref={noteInputRef}
              className="border border-gray-300 rounded-lg p-4 mb-4 text-base bg-gray-50"
              multiline
              numberOfLines={6}
              placeholder="Enter your note here"
              value={noteText}
              onChangeText={setNoteText}
            />
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="bg-gray-500 py-3 px-6 rounded-lg items-center flex-1 mr-2"
                onPress={() => {
                  setIsNoteModalVisible(false);
                  setIsModalOpen(false);
                }}
              >
                <Text className="text-white font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-600 py-3 px-6 rounded-lg items-center flex-1 ml-2"
                onPress={() => {
                  addNote();
                  setIsModalOpen(false);
                }}
              >
                <Text className="text-white font-medium">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderFullNotesModal() {
    const statuses = ['New', 'Gone', 'Later', 'Nope', 'Sold', 'Return'];
    const colors = ['#800080', '#FFD700', '#1E90FF', '#FF6347', '#32CD32', '#00008B'];
    
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isFullNotesModalVisible}
        onRequestClose={() => {
          setIsFullNotesModalVisible(false);
          setIsModalOpen(false);
        }}
      >
        <View className="flex-1 bg-white p-5 justify-start">
          <Text className="text-2xl font-bold mb-5 text-center text-gray-800">All Notes</Text>
          <ScrollView className="flex-1">
            {allNotes.map((note, index) => {
              const userName = note.profiles ? `${note.profiles.first_name || ''} ${note.profiles.last_name || ''}`.trim() : 'Unknown User';
              const noteStatus = note.status !== null && note.status !== undefined ? note.status : null;
              
              return (
                <View key={index} className="p-3.5 border-b border-gray-300">
                  <View className="flex-row items-start">
                    {/* Status Indicator */}
                    <View className="mr-3 items-center">
                      {noteStatus !== null ? (
                        <>
                          <View 
                            style={{ backgroundColor: colors[noteStatus] }} 
                            className="h-3 w-8 mb-1 rounded" 
                          />
                          <Text className="text-xs text-center font-medium text-gray-900">
                            {statuses[noteStatus]}
                          </Text>
                        </>
                      ) : (
                        <View className="h-3 w-8 mb-1">
                          {/* Empty space for notes without status */}
                        </View>
                      )}
                    </View>
                    
                    {/* Note Content */}
                    <View className="flex-1">
                      <Text className="text-base text-gray-800">{note.note}</Text>
                      <View className="flex-row justify-between items-center mt-1.25">
                        <Text className="text-xs text-gray-500">
                          {note.created_at ? new Date(note.created_at).toLocaleString() : 'No timestamp'}
                        </Text>
                        <Text className="text-xs text-gray-600 font-medium">
                          - {userName}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            className="bg-blue-500 py-3.5 rounded mt-5 items-center"
            onPress={() => {
              setIsFullNotesModalVisible(false);
              setIsModalOpen(false);
            }}
          >
            <Text className="text-white text-lg font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  async function createNewLead(coordinate) {
    try {
      // Get current user info
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        Alert.alert('Error', 'Authentication error');
        return;
      }

      // Create temporary lead ID for optimistic update
      const tempLeadId = `temp_${Date.now()}`;
      
      // Create optimistic lead object and add to state immediately
      const optimisticLead = {
        id: tempLeadId,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        location: {
          type: 'Point',
          coordinates: [coordinate.longitude, coordinate.latitude]
        },
        status: 0,
        knocks: 0,
        user_id: userData.user.id,
        isTeamLead: false,
        fullAddress: 'Loading address...',
        address: 'Loading...',
        address2: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        dob: '',
        mostRecentNote: null
      };

      // Add the optimistic lead to the map immediately
      setLeads(prevLeads => [...prevLeads, optimisticLead]);

      // Now handle the background processing
      try {
        // Get user's organization
        const { data: userOrg, error: userOrgError } = await supabase
          .from('profiles')
          .select('organization')
          .eq('user_id', userData.user.id)
          .single();

        if (userOrgError) {
          console.error('Error fetching user organization:', userOrgError);
          // Remove optimistic lead and show error
          setLeads(prevLeads => prevLeads.filter(lead => lead.id !== tempLeadId));
          Alert.alert('Error', 'Failed to create lead: Unable to fetch user information');
          return;
        }

        // Get address from coordinates using reverse geocoding
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        let formattedAddress = 'Address not found';
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let zip = '';

        if (data.results && data.results.length > 0) {
          const addressComponents = data.results[0].address_components;
          formattedAddress = data.results[0].formatted_address;

          // Extract address components
          addressComponents.forEach(component => {
            if (component.types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (component.types.includes('route')) {
              route = component.long_name;
            } else if (component.types.includes('locality')) {
              city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (component.types.includes('postal_code')) {
              zip = component.long_name;
            }
          });
        }

        // Create new lead with address information
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert([{
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            location: {
              type: 'Point',
              coordinates: [coordinate.longitude, coordinate.latitude]
            },
            organization: userOrg.organization,
            status: 0,
            address: `${streetNumber} ${route}`.trim() || 'Unknown Address',
            address2: '',
            city: city,
            state: state,
            zip5: parseInt(zip) || null,
            zip9: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: userData.user.id,
            knocks: 0,
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            dob: ''
          }])
          .select()
          .single();

        if (leadError) {
          console.error('Error creating lead:', leadError);
          // Remove optimistic lead and show error
          setLeads(prevLeads => prevLeads.filter(lead => lead.id !== tempLeadId));
          Alert.alert('Error', 'Failed to create lead in database');
          return;
        }

        // Update the optimistic lead with real data
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === tempLeadId 
              ? {
                  ...lead,
                  id: newLead.id,
                  fullAddress: formattedAddress,
                  address: newLead.address,
                  address2: newLead.address2,
                  city: newLead.city,
                  state: newLead.state,
                  zip5: newLead.zip5
                }
              : lead
          )
        );

        // Automatically open the lead menu for editing
        selectedLead.current = {
          ...optimisticLead,
          id: newLead.id,
          fullAddress: formattedAddress,
          address: newLead.address,
          address2: newLead.address2,
          city: newLead.city,
          state: newLead.state,
          zip5: newLead.zip5
        };
        setSelectedLeadId(newLead.id);
        setEditableAddress(formattedAddress);
        setNewLeadId(newLead.id);
        setNewLeadCoordinate(coordinate);
        setLeadAddress(formattedAddress);
        // Don't set isModalOpen since we want the status menu, not a blocking modal

      } catch (error) {
        console.error('Error in background lead processing:', error);
        // Remove optimistic lead on error
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== tempLeadId));
        Alert.alert('Error', 'Failed to create lead');
      }
    } catch (error) {
      console.error('Error in createNewLead:', error);
      Alert.alert('Error', 'Failed to create lead');
    }
  }

  async function saveNewLead() {
    try {
      if (!newLeadId || !editableAddress.trim()) {
        Alert.alert('Error', 'Please enter a valid address');
        return;
      }

      // Get current user info
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        Alert.alert('Error', 'Authentication error');
        return;
      }

      // Parse the edited address to extract just the street address (everything before first comma)
      const addressParts = editableAddress.trim().split(',');
      const streetAddress = addressParts[0].trim(); // Only the street address portion
      
      let parsedAddress = {
        address: streetAddress,
        city: '',
        state: '',
        zip5: null
      };

      // If the user edited the address, try to re-geocode it to get proper components
      if (editableAddress.trim() !== '') {
        try {
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(editableAddress.trim())}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const geocodeData = await geocodeResponse.json();

          if (geocodeData.results && geocodeData.results.length > 0) {
            const addressComponents = geocodeData.results[0].address_components;
            
            let streetNumber = '';
            let route = '';
            let city = '';
            let state = '';
            let zip = '';

            addressComponents.forEach(component => {
              if (component.types.includes('street_number')) {
                streetNumber = component.long_name;
              } else if (component.types.includes('route')) {
                route = component.long_name;
              } else if (component.types.includes('locality')) {
                city = component.long_name;
              } else if (component.types.includes('administrative_area_level_1')) {
                state = component.short_name;
              } else if (component.types.includes('postal_code')) {
                zip = component.long_name;
              }
            });

            // Update parsed address with proper components
            // Use the street address portion from user input, but geocoded components for city/state/zip
            parsedAddress = {
              address: streetAddress, // Only street address, not full formatted address
              city: city,
              state: state,
              zip5: parseInt(zip) || null
            };
          }
        } catch (geocodeError) {
          console.error('Error re-geocoding edited address:', geocodeError);
          // Fall back to using just the street address portion
          parsedAddress.address = streetAddress;
        }
      }

      // Update the lead with the properly parsed address components
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          address: parsedAddress.address,
          city: parsedAddress.city,
          state: parsedAddress.state,
          zip5: parsedAddress.zip5,
          updated_at: new Date().toISOString()
        })
        .eq('id', newLeadId);

      if (updateError) {
        console.error('Error updating lead address:', updateError);
        Alert.alert('Error', 'Failed to update lead address');
        return;
      }

      // Construct the full address for display
      const newFullAddress = `${parsedAddress.address}${parsedAddress.city ? `, ${parsedAddress.city}` : ''}${parsedAddress.state ? `, ${parsedAddress.state}` : ''}${parsedAddress.zip5 ? ` ${parsedAddress.zip5}` : ''}`.trim();
      
      // Update the lead in local state with the confirmed address components
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === newLeadId 
            ? {
                ...lead,
                address: parsedAddress.address,
                city: parsedAddress.city,
                state: parsedAddress.state,
                zip5: parsedAddress.zip5,
                fullAddress: newFullAddress
              }
            : lead
        )
      );
      
      // Update the leadAddress state for immediate display update
      setLeadAddress(newFullAddress);

      // Handle territory assignment in the background
      try {
        // Get user's organization
        const { data: userOrg, error: userOrgError } = await supabase
          .from('profiles')
          .select('organization')
          .eq('user_id', userData.user.id)
          .single();

        if (userOrgError) {
          console.error('Error fetching user organization:', userOrgError);
        } else {
          // Get user's territories
          const { data: userTerritories, error: userTerritoriesError } = await supabase
            .from('users_join_territories')
            .select('territory_id')
            .eq('uid', userData.user.id);

          if (!userTerritoriesError && userTerritories) {
            // Get territory geometries
            const territoryIds = userTerritories.map(t => t.territory_id);
            const { data: territories, error: territoriesError } = await supabase
              .from('territories')
              .select('id, geom')
              .in('id', territoryIds);

            if (!territoriesError && territories) {
              // Check if lead is in any existing territory
              let leadInTerritory = false;
              for (const territory of territories) {
                if (!territory.geom || !territory.geom.coordinates || !territory.geom.coordinates[0]) {
                  continue;
                }

                const isInPolygon = isPointInPolygon(
                  { latitude: newLeadCoordinate.latitude, longitude: newLeadCoordinate.longitude },
                  territory.geom.coordinates[0]
                );

                if (isInPolygon) {
                  // Add lead to existing territory
                  const { error: joinError } = await supabase
                    .from('leads_join_territories')
                    .insert([{
                      lead_id: newLeadId,
                      territory_id: territory.id,
                      created_at: new Date().toISOString()
                    }]);

                  if (!joinError) {
                    leadInTerritory = true;
                    break;
                  }
                }
              }

              // If lead is not in any territory, create a new small territory
              if (!leadInTerritory) {
                const radius = 0.0009; // roughly 100m in degrees
                const polygon = [
                  [newLeadCoordinate.longitude - radius, newLeadCoordinate.latitude - radius],
                  [newLeadCoordinate.longitude + radius, newLeadCoordinate.latitude - radius],
                  [newLeadCoordinate.longitude + radius, newLeadCoordinate.latitude + radius],
                  [newLeadCoordinate.longitude - radius, newLeadCoordinate.latitude + radius],
                  [newLeadCoordinate.longitude - radius, newLeadCoordinate.latitude - radius]
                ];

                // Create new territory
                const { data: newTerritory, error: territoryError } = await supabase
                  .from('territories')
                  .insert([{
                    name: `Lead ${newLeadId} Territory`,
                    geom: {
                      type: 'Polygon',
                      coordinates: [polygon]
                    },
                    organization: userOrg.organization,
                    created_at: new Date().toISOString()
                  }])
                  .select()
                  .single();

                if (!territoryError) {
                  // Add user to territory
                  await supabase
                    .from('users_join_territories')
                    .insert([{
                      uid: userData.user.id,
                      territory_id: newTerritory.id,
                      created_at: new Date().toISOString()
                    }]);

                  // Add lead to territory
                  await supabase
                    .from('leads_join_territories')
                    .insert([{
                      lead_id: newLeadId,
                      territory_id: newTerritory.id,
                      created_at: new Date().toISOString()
                    }]);
                }
              }
            }
          }
        }
      } catch (territoryError) {
        console.error('Error handling territory assignment:', territoryError);
        // Don't alert for territory errors - the lead is still created successfully
      }

      // Save any note that was entered during lead creation
      if (inlineNoteText.trim() !== '') {
        try {
          const { error: noteError } = await supabase.from('notes').insert({
            lead_id: newLeadId,
            note: inlineNoteText.trim(),
            created_by: userData.user.id,
            created_at: new Date().toISOString(),
            status: selectedLead.current?.status || 0,
          });

          if (noteError) {
            console.error('Error saving note for new lead:', noteError);
            // Don't fail the lead creation for note errors, just log it
          } else {
            console.log('Note saved successfully for new lead');
            
            // Update the lead in local state with the note
            const newNote = { 
              note: inlineNoteText.trim(), 
              created_at: new Date().toISOString() 
            };
            
            setLeads(prevLeads => 
              prevLeads.map(lead => 
                lead.id === newLeadId 
                  ? { ...lead, mostRecentNote: newNote }
                  : lead
              )
            );
          }
        } catch (noteError) {
          console.error('Unexpected error saving note for new lead:', noteError);
          // Don't fail the lead creation for note errors
        }
      }
      
      // Clear all new lead state and close menu
      selectedLead.current = null;
      setSelectedLeadId(null);
      setRecentNote(null);
      setLeadAddress(null);
      setMenuPosition({ x: 0, y: 0 });
      setInlineNoteText('');
      setShowNewLeadButton(false);
      setNewLeadAddress('');
      setEditableAddress('');
      setNewLeadId(null);
      setNewLeadCoordinate(null);
      setDummyRender((prev) => !prev);
    } catch (error) {
      console.error('Error in saveNewLead:', error);
      Alert.alert('Error', 'Failed to save lead');
    }
  }

  async function confirmLeadAddress() {
    try {
      // Get current user info
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        Alert.alert('Error', 'Authentication error');
        return;
      }

      // Update the lead with the edited address
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          address: editableAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', newLeadId);

      if (updateError) {
        console.error('Error updating lead address:', updateError);
        Alert.alert('Error', 'Failed to update lead address');
        return;
      }

      // Update the lead in local state with the confirmed address
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === newLeadId 
            ? {
                ...lead,
                address: editableAddress,
                fullAddress: editableAddress
              }
            : lead
        )
      );

      // Handle territory assignment in the background
      try {
        // Get user's organization
        const { data: userOrg, error: userOrgError } = await supabase
          .from('profiles')
          .select('organization')
          .eq('user_id', userData.user.id)
          .single();

        if (userOrgError) {
          console.error('Error fetching user organization:', userOrgError);
          return;
        }

        // Get user's territories
        const { data: userTerritories, error: userTerritoriesError } = await supabase
          .from('users_join_territories')
          .select('territory_id')
          .eq('uid', userData.user.id);

        if (userTerritoriesError) {
          console.error('Error fetching user territories:', userTerritoriesError);
          return;
        }

        // Get territory geometries
        const territoryIds = userTerritories.map(t => t.territory_id);
        const { data: territories, error: territoriesError } = await supabase
          .from('territories')
          .select('id, geom')
          .in('id', territoryIds);

        if (territoriesError) {
          console.error('Error fetching territory geometries:', territoriesError);
          return;
        }

        // Check if lead is in any existing territory
        let leadInTerritory = false;
        for (const territory of territories) {
          if (!territory.geom || !territory.geom.coordinates || !territory.geom.coordinates[0]) {
            continue;
          }

          const isInPolygon = isPointInPolygon(
            { latitude: newLeadCoordinate.latitude, longitude: newLeadCoordinate.longitude },
            territory.geom.coordinates[0]
          );

          if (isInPolygon) {
            // Add lead to existing territory
            const { error: joinError } = await supabase
              .from('leads_join_territories')
              .insert([{
                lead_id: newLeadId,
                territory_id: territory.id,
                created_at: new Date().toISOString()
              }]);

            if (joinError) {
              console.error('Error joining lead to territory:', joinError);
            } else {
              leadInTerritory = true;
              break;
            }
          }
        }

        // If lead is not in any territory, create a new small territory
        if (!leadInTerritory) {
          // Create a small polygon around the point (approximately 100m radius)
          const radius = 0.0009; // roughly 100m in degrees
          const polygon = [
            [newLeadCoordinate.longitude - radius, newLeadCoordinate.latitude - radius],
            [newLeadCoordinate.longitude + radius, newLeadCoordinate.latitude - radius],
            [newLeadCoordinate.longitude + radius, newLeadCoordinate.latitude + radius],
            [newLeadCoordinate.longitude - radius, newLeadCoordinate.latitude + radius],
            [newLeadCoordinate.longitude - radius, newLeadCoordinate.latitude - radius]
          ];

          // Create new territory
          const { data: newTerritory, error: territoryError } = await supabase
            .from('territories')
            .insert([{
              name: `Lead ${newLeadId} Territory`,
              geom: {
                type: 'Polygon',
                coordinates: [polygon]
              },
              organization: userOrg.organization,
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (territoryError) {
            console.error('Error creating territory:', territoryError);
            return;
          }

          // Add user to territory
          const { error: userJoinError } = await supabase
            .from('users_join_territories')
            .insert([{
              uid: userData.user.id,
              territory_id: newTerritory.id,
              created_at: new Date().toISOString()
            }]);

          if (userJoinError) {
            console.error('Error joining user to territory:', userJoinError);
          }

          // Add lead to territory
          const { error: leadJoinError } = await supabase
            .from('leads_join_territories')
            .insert([{
              lead_id: newLeadId,
              territory_id: newTerritory.id,
              created_at: new Date().toISOString()
            }]);

          if (leadJoinError) {
            console.error('Error joining lead to territory:', leadJoinError);
          }
        }
      } catch (territoryError) {
        console.error('Error handling territory assignment:', territoryError);
        // Don't alert for territory errors - the lead is still created successfully
      }
      
      // Clear all state and close modal
      setShowNewLeadButton(false);
      setNewLeadAddress('');
      setEditableAddress('');
      setNewLeadId(null);
      setNewLeadCoordinate(null);
    } catch (error) {
      console.error('Error in confirmLeadAddress:', error);
      Alert.alert('Error', 'Failed to confirm lead address');
      // Still clear state even if there's an error
      setShowNewLeadButton(false);
      setNewLeadAddress('');
      setEditableAddress('');
      setNewLeadId(null);
      setNewLeadCoordinate(null);
    }
  }

  async function cancelLeadCreation() {
    try {
      // Delete the lead if it exists
      if (newLeadId) {
        // If it's a temporary lead (optimistic update), just remove from state
        if (newLeadId.toString().startsWith('temp_')) {
          setLeads(prevLeads => prevLeads.filter(lead => lead.id !== newLeadId));
        } else {
          // If it's a real lead in database, delete it
          const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('id', newLeadId);

          if (deleteError) {
            console.error('Error deleting lead:', deleteError);
          } else {
            // Also remove from local state
            setLeads(prevLeads => prevLeads.filter(lead => lead.id !== newLeadId));
          }
        }
      }

      setShowNewLeadButton(false);
      setNewLeadAddress('');
      setEditableAddress('');
      setNewLeadId(null);
      setNewLeadCoordinate(null);
    } catch (error) {
      console.error('Error in cancelLeadCreation:', error);
    }
  }

  async function handleMapInteraction() {
    // Don't interfere if we're in the middle of a marker long press
    if (isMarkerLongPressing) {
      return;
    }
    
    // Check if a marker was pressed very recently (within 200ms) - if so, ignore this map interaction
    const timeSinceMarkerPress = Date.now() - lastMarkerPressTime.current;
    if (timeSinceMarkerPress < 200) {
      console.log('🚫 Ignoring map interaction - marker was pressed', timeSinceMarkerPress, 'ms ago');
      return;
    }
    
    console.log('🗺️ Processing map interaction');
    
    // Auto-save inline note before closing menu
    if (selectedLead.current && inlineNoteText.trim() !== '') {
      await autoSaveInlineNote();
    }
    
    // Close all modals
    setIsNoteModalVisible(false);
    setIsFullNotesModalVisible(false);
    setIsModalOpen(false);
    
    // Hide drawer and clear lead status
    animateDrawerTo('hidden');
    selectedLead.current = null;
    setSelectedLeadId(null);
    setRecentNote(null);
    setLeadAddress(null);
    setInlineNoteText(''); // Clear inline note text
    setDummyRender((prev) => !prev);
  }



  // Optimize marker rendering for large datasets
  const renderMapMarkers = useMemo(() => {
    if (isClustering) {
      return clusteredPoints.map((point) => {
        if (point.properties.cluster) {
          const { cluster_id, point_count } = point.properties;
          const coordinate = {
            latitude: point.geometry.coordinates[1],
            longitude: point.geometry.coordinates[0],
          };

          return (
            <Marker
              key={`cluster-${cluster_id}`}
              coordinate={coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => {
                const expansionZoom = supercluster.getClusterExpansionZoom(cluster_id);
                const newRegion = {
                  latitude: coordinate.latitude,
                  longitude: coordinate.longitude,
                  latitudeDelta: Math.max(initialRegion.latitudeDelta / 2, 0.005),
                  longitudeDelta: Math.max(initialRegion.longitudeDelta / 2, 0.005),
                };
                mapRef.current.animateToRegion(newRegion, 500);
              }}
            >
              <View className="w-10 h-10 rounded-full bg-blue-500 justify-center items-center">
                <Text className="text-white font-bold">
                  {point_count >= 1000 ? '1000+' : point_count >= 250 ? '250+' : point_count}
                </Text>
              </View>
            </Marker>
          );
        }

        const lead = point.properties;
        return (
          <Marker
            key={`${lead.id}-${lead.status}`}
            coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            onPress={(event) => {
              console.log('📱 Marker onPress fired for lead:', lead.id);
              event.stopPropagation && event.stopPropagation();
              showMenu(lead, event);
            }}
            onLongPress={() => handleMarkerLongPress(lead)}
            onDragStart={() => handleDragStart(lead)}
            onDragEnd={(e) => handleDragEnd(lead, e)}
            draggable={!lead.isTeamLead || !isManager || !managerModeEnabled}
            tracksViewChanges={false}
          >
            <Image 
              source={getStatusMarkerImage(lead.status)}
              style={{ 
                width: 32, 
                height: 32,
                opacity: (lead.isTeamLead && isManager && managerModeEnabled) ? 0.7 : 1.0
              }}
              resizeMode="contain"
            />
          </Marker>
        );
      });
    } else {
      // For non-clustered view, limit the number of markers rendered for performance
      const markersToRender = visibleLeads.slice(0, 2000); // Limit to 2000 markers max
      return markersToRender.map((lead) => (
        <Marker
          key={`${lead.id}-${lead.status}`}
          coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
          anchor={{ x: 0.5, y: 1 }}
          onPress={(event) => {
            console.log('📱 Marker onPress fired for lead:', lead.id);
            event.stopPropagation && event.stopPropagation();
            showMenu(lead, event);
          }}
          onLongPress={() => handleMarkerLongPress(lead)}
          onDragStart={() => handleDragStart(lead)}
          onDragEnd={(e) => handleDragEnd(lead, e)}
          draggable={!lead.isTeamLead || !isManager || !managerModeEnabled}
          tracksViewChanges={false}
        >
          <Image 
            source={getStatusMarkerImage(lead.status)}
            style={{ 
              width: 32, 
              height: 32,
              opacity: (lead.isTeamLead && isManager && managerModeEnabled) ? 0.7 : 1.0
            }}
            resizeMode="contain"
          />
        </Marker>
      ));
    }
  }, [clusteredPoints, visibleLeads, isClustering, isManager, managerModeEnabled]);

  const memoizedMap = useMemo(
    () => (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        edgePadding={{ top: 50, right: 50, bottom: 50, left: 50 }}
        onRegionChange={() => {
          // Hide the +New Lead button immediately when user starts panning/zooming
          if (!isMarkerLongPressing && !bigMenu) {
            setShowNewLeadButton(false);
          }
        }}
        onRegionChangeComplete={(newRegion) => {
          onRegionChangeComplete(newRegion);
          // Don't close menu when panning/zooming - only hide the +New Lead button
          if (!isMarkerLongPressing && !bigMenu) {
            setShowNewLeadButton(false);
          }
        }}
        className="flex-1"
        onPress={(e) => {
          console.log('🗺️ Map onPress fired');
          // Don't handle map press if big menu is open or marker long press is active
          if (!bigMenu && !isMarkerLongPressing) {
            handleMapInteraction();
            if (isDrawingMode) {
              handleMapPress(e);
            } else if (isDrawing) {
              const newPoint = e.nativeEvent.coordinate;
              setPolygonPoints([...polygonPoints, newPoint]);
            } else {
              setShowNewLeadButton(false);
            }
          }
        }}

        onLongPress={(e) => {
          // Only handle map long press if we're not in a marker long press operation
          if (!isDrawing && !isDrawingMode && !isMarkerLongPressing && !bigMenu) {
            handleMapInteraction();
            const { coordinate } = e.nativeEvent;
            setNewLeadCoordinate(coordinate);
            mapRef.current.pointForCoordinate(coordinate).then((point) => {
              setNewLeadButtonPosition(point);
              setShowNewLeadButton(true);
            });
          }
        }}
        moveOnMarkerPress={false}
        loadingEnabled={true}
        loadingIndicatorColor="#000000"
        loadingBackgroundColor="#ffffff"
        showsUserLocation={locationPermission}
        scrollEnabled={!isDrawing && !isDrawingMode && !isModalOpen}
        zoomEnabled={!isModalOpen}
        rotateEnabled={!isModalOpen}
        pitchEnabled={!isModalOpen}
        mapType={isSatellite ? 'satellite' : 'standard'}
        showsMyLocationButton={false}
        onMapReady={() => setIsMapReady(true)}
        // Optimize map performance for large datasets
        showsPointsOfInterest={leads.length < 1000} // Disable POI for large datasets
        showsBuildings={leads.length < 1000} // Disable buildings for large datasets
        showsTraffic={false} // Always disable traffic for better performance
        toolbarEnabled={false} // Disable toolbar for better performance
      >
        {/* Render team territories when manager mode is enabled */}
        {isManager && managerModeEnabled && teamTerritories.map((territory) => (
          <Polygon
            key={`territory-${territory.id}`}
            coordinates={territory.coordinates}
            strokeColor={territory.color}
            fillColor={`${territory.color}40`} // Add 40 (25% opacity) to the hex color
            strokeWidth={2}
            tappable={true}
            onPress={() => {
              // Show territory info when tapped
              console.log(`Territory: ${territory.name}`);
            }}
          />
        ))}

        {/* Show the polygon being drawn for territory creation */}
        {isDrawingMode && polygonCoordinates.length > 0 && (
          <Polygon
            coordinates={polygonCoordinates}
            strokeColor={territoryColor}
            fillColor={`${territoryColor}40`}
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Show markers for polygon points being drawn */}
        {isDrawingMode && polygonCoordinates.map((point, index) => (
          <Marker
            key={`drawing-point-${index}`}
            coordinate={point}
            pinColor={territoryColor}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View 
              className="w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: territoryColor }}
            />
          </Marker>
        ))}
        
        {/* Render optimized markers */}
        {renderMapMarkers}

        {polygonPoints.length > 0 && (
          <Polygon
            coordinates={polygonPoints}
            strokeColor="#000"
            fillColor="rgba(0, 200, 0, 0.5)"
            strokeWidth={2}
          />
        )}
      </MapView>
    ),
    [
      initialRegion,
      renderMapMarkers, // Use the memoized markers
      polygonPoints,
      locationPermission,
      isSatellite,
      teamTerritories,
      isManager,
      managerModeEnabled,
      isDrawingMode,
      polygonCoordinates,
      territoryColor,
      leads.length, // Add this to re-render when lead count changes significantly
    ]
  );

  async function fetchTeamTerritories() {
    try {
      if (!userTeamRef.current) {
        console.log('No team assigned to this user');
        return;
      }

      // Get all users in the same team
      const { data: teamUsers, error: teamUsersError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('team', userTeamRef.current);

      if (teamUsersError) {
        console.error('Error fetching team users:', teamUsersError);
        return;
      }

      if (!teamUsers || teamUsers.length === 0) {
        console.log('No users found in this team');
        return;
      }

      // Extract user IDs
      const teamUserIds = teamUsers.map(user => user.user_id);

      // Get all territory IDs assigned to team members
      const { data: teamTerritories, error: teamTerritoriesError } = await supabase
        .from('users_join_territories')
        .select('territory_id')
        .in('uid', teamUserIds);

      if (teamTerritoriesError) {
        console.error('Error fetching team territories:', teamTerritoriesError);
        return;
      }

      if (!teamTerritories || teamTerritories.length === 0) {
        console.log('No territories assigned to team members');
        return;
      }

      // Extract territory IDs
      const territoryIds = teamTerritories.map(territory => territory.territory_id);

      // Get territory data including geometry
      const { data: territoryData, error: territoryDataError } = await supabase
        .from('territories')
        .select('id, name, geom, color')
        .in('id', territoryIds);

      if (territoryDataError) {
        console.error('Error fetching territory data:', territoryDataError);
        return;
      }

      if (territoryData) {
        // Format territory data for display
        const formattedTerritories = territoryData.map(territory => {
          // Parse GeoJSON if it's stored as a string or extract coordinates if it's already an object
          let coordinates = [];
          try {
            const geomData = typeof territory.geom === 'string' 
              ? JSON.parse(territory.geom) 
              : territory.geom;
            
            // Handle different GeoJSON types
            if (geomData.type === 'Polygon') {
              coordinates = geomData.coordinates[0].map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
              }));
            } else if (geomData.type === 'MultiPolygon') {
              // For MultiPolygon, we'll just take the first polygon for now
              coordinates = geomData.coordinates[0][0].map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
              }));
            }
          } catch (error) {
            console.error('Error parsing territory geometry:', error);
          }

          return {
            id: territory.id,
            name: territory.name,
            coordinates: coordinates,
            color: territory.color || '#4B0082' // Default to indigo if no color specified
          };
        });

        setTeamTerritories(formattedTerritories);
      }
    } catch (error) {
      console.error('Unexpected error fetching team territories:', error);
    }
  }

  async function fetchTeamUsers() {
    try {
      if (!userTeamRef.current) {
        console.log('No team assigned to this user');
        return;
      }

      // Get all users in the same team
      const { data: teamUsers, error: teamUsersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, user_type')
        .eq('team', userTeamRef.current);

      if (teamUsersError) {
        console.error('Error fetching team users:', teamUsersError);
        return;
      }

      setTeamUsers(teamUsers || []);
    } catch (error) {
      console.error('Unexpected error fetching team users:', error);
    }
  }

  function startDrawingMode() {
    setIsDrawingMode(true);
    setPolygonCoordinates([]);
    setCurrentPolygon(null);
    setIsModalMinimized(true); // Minimize modal when drawing
  }

  function stopDrawingMode() {
    setIsDrawingMode(false);
    setPolygonCoordinates([]);
    setCurrentPolygon(null);
  }

  function handleMapPress(event) {
    if (!isDrawingMode) return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newPoint = { latitude, longitude };
    
    setPolygonCoordinates(prevCoords => [...prevCoords, newPoint]);
  }

  function completePolygon() {
    if (polygonCoordinates.length < 3) {
      alert('A polygon needs at least 3 points');
      return;
    }
    
    setIsDrawingMode(false);
    setIsModalMinimized(false); // Expand modal to show form
  }

  function cancelDrawing() {
    setIsDrawingMode(false);
    setPolygonCoordinates([]);
    setCurrentPolygon(null);
    setIsModalMinimized(false);
  }

  function clearPolygon() {
    setPolygonCoordinates([]);
    setCurrentPolygon(null);
  }

  // Point-in-polygon algorithm (Ray casting)
  function isPointInPolygon(point, polygon) {
    const { latitude: y, longitude: x } = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]; // longitude
      const yi = polygon[i][1]; // latitude
      const xj = polygon[j][0]; // longitude
      const yj = polygon[j][1]; // latitude
      
      const intersect = ((yi > y) !== (yj > y)) && 
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  // Check if a lead is covered by any existing territory (excluding specified territory)
  function isLeadCoveredByOtherTerritories(lead, excludeTerritoryId = null) {
    for (const territory of teamTerritories) {
      if (territory.id === excludeTerritoryId) continue;
      
      if (isPointInPolygon({ latitude: lead.latitude, longitude: lead.longitude }, territory.coordinates)) {
        return { covered: true, territoryId: territory.id, territoryName: territory.name };
      }
    }
    return { covered: false };
  }

  // Find all territories that overlap with a given set of coordinates
  function findOverlappingTerritories(polygonCoordinates, excludeTerritoryId = null) {
    const overlappingTerritories = [];
    
    for (const territory of teamTerritories) {
      if (territory.id === excludeTerritoryId) continue;
      
      // Check if any territory leads are within the new polygon
      const territoryLeadIds = [];
      
      // Get leads assigned to this territory
      for (const lead of leads) {
        if (isPointInPolygon({ latitude: lead.latitude, longitude: lead.longitude }, territory.coordinates)) {
          territoryLeadIds.push(lead.id);
        }
      }
      
      // Check if any of these leads would be encapsulated by the new polygon
      let hasOverlap = false;
      for (const leadId of territoryLeadIds) {
        const lead = leads.find(l => l.id === leadId);
        if (lead && isPointInPolygon({ latitude: lead.latitude, longitude: lead.longitude }, polygonCoordinates)) {
          hasOverlap = true;
          break;
        }
      }
      
      if (hasOverlap) {
        overlappingTerritories.push({
          id: territory.id,
          name: territory.name,
          isRecovery: isRecoveryTerritory(territory.name),
          leadIds: territoryLeadIds.filter(leadId => {
            const lead = leads.find(l => l.id === leadId);
            return lead && isPointInPolygon({ latitude: lead.latitude, longitude: lead.longitude }, polygonCoordinates);
          })
        });
      }
    }
    
    return overlappingTerritories;
  }

  // Handle encapsulation of recovery territories
  async function handleTerritoryEncapsulation(newTerritoryId, polygonCoordinates) {
    try {
      const overlappingTerritories = findOverlappingTerritories(polygonCoordinates, newTerritoryId);
      const recoveryTerritoriesToUpdate = overlappingTerritories.filter(t => t.isRecovery);
      
      if (recoveryTerritoriesToUpdate.length === 0) return;
      
      console.log(`Found ${recoveryTerritoriesToUpdate.length} recovery territories to potentially encapsulate`);
      
      for (const recoveryTerritory of recoveryTerritoriesToUpdate) {
        console.log(`Processing encapsulation of recovery territory: ${recoveryTerritory.name}`);
        
        // Move the encapsulated leads to the new territory
        if (recoveryTerritory.leadIds.length > 0) {
          const { error: updateLeadsError } = await supabase
            .from('leads_join_territories')
            .update({ territory_id: newTerritoryId })
            .in('lead_id', recoveryTerritory.leadIds);
          
          if (updateLeadsError) {
            console.error('Error moving leads from encapsulated recovery territory:', updateLeadsError);
          } else {
            console.log(`Moved ${recoveryTerritory.leadIds.length} leads from recovery territory to new territory`);
          }
        }
        
        // Update the recovery territory (will resize or delete if empty)
        await updateRecoveryTerritory(recoveryTerritory.id);
      }
      
    } catch (error) {
      console.error('Error handling territory encapsulation:', error);
    }
  }

  // Get leads that would be truly orphaned (not covered by any other territory)
  async function getOrphanedLeads(deletingTerritoryId) {
    try {
      // Get leads currently assigned to the territory being deleted
      const { data: leadsToCheck, error: leadsError } = await supabase
        .from('leads_join_territories')
        .select('lead_id')
        .eq('territory_id', deletingTerritoryId);

      if (leadsError || !leadsToCheck) {
        console.error('Error fetching leads to check:', leadsError);
        return [];
      }

      const leadIds = leadsToCheck.map(l => l.lead_id);
      const leadsData = leads.filter(lead => leadIds.includes(lead.id));
      
      // Check each lead to see if it's covered by other territories
      const orphanedLeads = [];
      
      for (const lead of leadsData) {
        const coverage = isLeadCoveredByOtherTerritories(lead, deletingTerritoryId);
        if (!coverage.covered) {
          orphanedLeads.push(lead);
        } else {
          console.log(`Lead ${lead.id} is already covered by territory: ${coverage.territoryName}`);
        }
      }
      
      console.log(`Found ${orphanedLeads.length} truly orphaned leads out of ${leadsData.length} total leads`);
      return orphanedLeads;
      
    } catch (error) {
      console.error('Error checking for orphaned leads:', error);
      return [];
    }
  }

  // Save territory function
  async function saveTerritory() {
    if (!territoryName.trim()) {
      alert('Please enter a territory name');
      return;
    }
    if (polygonCoordinates.length < 3) {
      alert('Please draw a territory boundary with at least 3 points');
      return;
    }
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to assign to this territory');
      return;
    }

    setIsSavingTerritory(true);

    try {
      // Get current user to access their organization/team
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        alert('Authentication error');
        return;
      }

      // Convert polygon coordinates to GeoJSON format
      const geoJsonPolygon = {
        type: 'Polygon',
        coordinates: [polygonCoordinates.map(coord => [coord.longitude, coord.latitude])]
      };

      // Ensure the polygon is closed (first point equals last point)
      const coords = geoJsonPolygon.coordinates[0];
      if (coords.length > 0 && 
          (coords[0][0] !== coords[coords.length - 1][0] || 
           coords[0][1] !== coords[coords.length - 1][1])) {
        coords.push([...coords[0]]);
      }

      if (isEditMode && editingTerritory) {
        // Update existing territory
        console.log('Updating territory...');
        
        // Step 1: Update territory in territories table
        const { error: territoryError } = await supabase
          .from('territories')
          .update({
            name: territoryName,
            color: territoryColor,
            geom: geoJsonPolygon
          })
          .eq('id', editingTerritory.id);

        if (territoryError) {
          console.error('Error updating territory:', territoryError);
          alert('Failed to update territory: ' + territoryError.message);
          return;
        }

        // Step 2: Delete existing user-territory relationships
        const { error: deleteUserJoinError } = await supabase
          .from('users_join_territories')
          .delete()
          .eq('territory_id', editingTerritory.id);

        if (deleteUserJoinError) {
          console.error('Error removing old user assignments:', deleteUserJoinError);
          alert('Failed to update user assignments: ' + deleteUserJoinError.message);
          return;
        }

        // Step 3: Create new user-territory relationships
        if (selectedUsers.length > 0) {
          const userJoinEntries = selectedUsers.map(userId => ({
            uid: userId,
            territory_id: editingTerritory.id,
            created_at: new Date()
          }));

          const { error: userJoinError } = await supabase
            .from('users_join_territories')
            .insert(userJoinEntries);

          if (userJoinError) {
            console.error('Error linking users to territory:', userJoinError);
            alert('Territory updated but failed to assign users: ' + userJoinError.message);
          }
        }

        // Step 4: Delete existing lead-territory relationships
        const { error: deleteLeadJoinError } = await supabase
          .from('leads_join_territories')
          .delete()
          .eq('territory_id', editingTerritory.id);

        if (deleteLeadJoinError) {
          console.error('Error removing old lead assignments:', deleteLeadJoinError);
          // Don't return here, continue with new assignments
        }

        // Step 5: Find leads within the new polygon and create new lead-territory relationships
        const leadsInPolygon = leads.filter(lead => 
          isPointInPolygon({ latitude: lead.latitude, longitude: lead.longitude }, polygonCoordinates)
        );

        console.log(`Found ${leadsInPolygon.length} leads within updated polygon`);

        if (leadsInPolygon.length > 0) {
          const leadJoinEntries = leadsInPolygon.map(lead => ({
            lead_id: lead.id,
            territory_id: editingTerritory.id,
            created_at: new Date()
          }));

          const { error: leadJoinError } = await supabase
            .from('leads_join_territories')
            .insert(leadJoinEntries);

          if (leadJoinError) {
            console.error('Error linking leads to territory:', leadJoinError);
            alert('Territory updated but failed to assign some leads: ' + leadJoinError.message);
          }
        }

        // Check and update any affected recovery territories
        await checkAndUpdateRecoveryTerritories();

        alert(`Territory "${territoryName}" updated successfully!\n${selectedUsers.length} users assigned\n${leadsInPolygon.length} leads assigned`);
      } else {
        // Create new territory (existing code)
      console.log('Creating territory...');
        
        // Get user's team/organization info for new territories
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team, organization')
          .eq('user_id', userData.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          alert('Failed to fetch user profile');
          return;
        }
      
      // Step 1: Insert territory into territories table
      const { data: territoryData, error: territoryError } = await supabase
        .from('territories')
        .insert([{
          name: territoryName,
          color: territoryColor,
            geom: geoJsonPolygon,
            organization: profile.organization
        }])
        .select()
        .single();

      if (territoryError) {
        console.error('Error creating territory:', territoryError);
        alert('Failed to create territory: ' + territoryError.message);
        return;
      }

      const territoryId = territoryData.id;
      console.log('Territory created with ID:', territoryId);

      // Step 2: Create user-territory relationships
      if (selectedUsers.length > 0) {
        const userJoinEntries = selectedUsers.map(userId => ({
          uid: userId,
          territory_id: territoryId,
          created_at: new Date()
        }));

        const { error: userJoinError } = await supabase
          .from('users_join_territories')
          .insert(userJoinEntries);

        if (userJoinError) {
          console.error('Error linking users to territory:', userJoinError);
          alert('Territory created but failed to assign users: ' + userJoinError.message);
        } else {
          console.log('Successfully linked users to territory');
        }
      }

        // Step 3: Handle encapsulation of recovery territories before assigning leads
        await handleTerritoryEncapsulation(territoryId, polygonCoordinates);

        // Step 4: Find leads within the polygon and create lead-territory relationships
      const leadsInPolygon = leads.filter(lead => 
        isPointInPolygon({ latitude: lead.latitude, longitude: lead.longitude }, polygonCoordinates)
      );

      console.log(`Found ${leadsInPolygon.length} leads within polygon`);

      if (leadsInPolygon.length > 0) {
        const leadJoinEntries = leadsInPolygon.map(lead => ({
          lead_id: lead.id,
          territory_id: territoryId,
          created_at: new Date()
        }));

        const { error: leadJoinError } = await supabase
          .from('leads_join_territories')
          .insert(leadJoinEntries);

        if (leadJoinError) {
          console.error('Error linking leads to territory:', leadJoinError);
          alert('Territory created but failed to assign some leads: ' + leadJoinError.message);
        } else {
          console.log('Successfully linked leads to territory');
        }
      }

        // Check and update any affected recovery territories
        await checkAndUpdateRecoveryTerritories();

      alert(`Territory "${territoryName}" saved successfully!\n${selectedUsers.length} users assigned\n${leadsInPolygon.length} leads assigned`);
      }
      
      // Reset form
      setIsAddingTerritory(false);
      setIsEditMode(false);
      setEditingTerritory(null);
      setTerritoryName('');
      setTerritoryColor('#FF0000');
      setSelectedUsers([]);
      stopDrawingMode();
      
      // Close the territories modal
      setIsTerritoriesModalVisible(false);
      setIsModalMinimized(false);
      
      // Refresh team territories if in manager mode
      if (isManager && managerModeEnabled) {
        fetchTeamTerritories();
      }

    } catch (error) {
      console.error('Unexpected error saving territory:', error);
      alert('Failed to save territory: ' + error.message);
    } finally {
      setIsSavingTerritory(false);
    }
  }

  async function startEditTerritory(territory) {
    try {
      setEditingTerritory(territory);
      setIsEditMode(true);
      setIsAddingTerritory(true);
      
      // Pre-fill form with territory data
      setTerritoryName(territory.name);
      setTerritoryColor(territory.color);
      
      // Convert territory coordinates to the format used by the drawing system
      setPolygonCoordinates(territory.coordinates);
      
      // Fetch and set assigned users
      const { data: assignedUsers, error } = await supabase
        .from('users_join_territories')
        .select('uid')
        .eq('territory_id', territory.id);
      
      if (error) {
        console.error('Error fetching assigned users:', error);
      } else {
        const userIds = assignedUsers.map(assignment => assignment.uid);
        setSelectedUsers(userIds);
      }
      
      // Make sure team users are loaded
      if (teamUsers.length === 0) {
        await fetchTeamUsers();
      }
      
    } catch (error) {
      console.error('Error starting territory edit:', error);
      alert('Failed to load territory data for editing');
    }
  }

  function cancelTerritoryForm() {
    setIsAddingTerritory(false);
    setIsEditMode(false);
    setEditingTerritory(null);
    setTerritoryName('');
    setTerritoryColor('#FF0000');
    setSelectedUsers([]);
    stopDrawingMode();
  }

  async function deleteTerritory() {
    if (!editingTerritory || !isEditMode) {
      console.error('No territory selected for deletion');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Delete Territory',
      `Are you sure you want to delete the territory "${editingTerritory.name}"?\n\nThis will remove all user assignments and lead assignments for this territory. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSavingTerritory(true);

            try {
              console.log('Deleting territory:', editingTerritory.id);

              // Step 1: Check which leads are truly orphaned (not covered by other territories)
              const orphanedLeads = await getOrphanedLeads(editingTerritory.id);

              console.log(`Found ${orphanedLeads.length} truly orphaned leads that need recovery`);

              // Get current user info for the recovery territory
              const { data: userData } = await supabase.auth.getUser();
              if (!userData?.user) {
                Alert.alert('Error', 'Authentication error');
                return;
              }

              // Step 2: Create recovery territory only for orphaned leads
              let recoveryTerritoryId = null;
              if (orphanedLeads.length > 0) {
                // Get the actual lead coordinates to create a bounding box
                const leadIds = orphanedLeads.map(lead => lead.id);
                const recoveryLeads = leads.filter(lead => leadIds.includes(lead.id));

                if (recoveryLeads.length > 0) {
                  // Create a more precise recovery territory using individual points instead of a large bounding box
                  let recoveryGeoJson;
                  
                  if (recoveryLeads.length === 1) {
                    // For single lead, create a small circle around it
                    const lead = recoveryLeads[0];
                    const radius = 0.002; // Very small radius (~200m)
                    const circleCoords = [];
                    const numPoints = 8;
                    
                    for (let i = 0; i < numPoints; i++) {
                      const angle = (i * 2 * Math.PI) / numPoints;
                      const lat = lead.latitude + radius * Math.cos(angle);
                      const lng = lead.longitude + radius * Math.sin(angle);
                      circleCoords.push({ latitude: lat, longitude: lng });
                    }
                    circleCoords.push(circleCoords[0]); // Close the polygon
                    
                    recoveryGeoJson = {
                      type: 'Polygon',
                      coordinates: [circleCoords.map(coord => [coord.longitude, coord.latitude])]
                    };
                  } else {
                    // For multiple leads, use a minimal bounding box with very small padding
                    const latitudes = recoveryLeads.map(lead => lead.latitude);
                    const longitudes = recoveryLeads.map(lead => lead.longitude);
                    
                    const minLat = Math.min(...latitudes);
                    const maxLat = Math.max(...latitudes);
                    const minLng = Math.min(...longitudes);
                    const maxLng = Math.max(...longitudes);
                    
                    // Use minimal padding to avoid overlap with other territories
                    const padding = 0.001; // Very small padding (~100m)
                    const boundingBoxCoords = [
                      { latitude: minLat - padding, longitude: minLng - padding },
                      { latitude: minLat - padding, longitude: maxLng + padding },
                      { latitude: maxLat + padding, longitude: maxLng + padding },
                      { latitude: maxLat + padding, longitude: minLng - padding },
                      { latitude: minLat - padding, longitude: minLng - padding } // Close the polygon
                    ];

                    recoveryGeoJson = {
                      type: 'Polygon',
                      coordinates: [boundingBoxCoords.map(coord => [coord.longitude, coord.latitude])]
                    };
                  }

                  // Create the recovery territory
                  const { data: recoveryTerritory, error: recoveryError } = await supabase
                    .from('territories')
                    .insert([{
                      name: `Recovered from "${editingTerritory.name}"`,
                      color: '#FFA500', // Orange color to distinguish recovery territories
                      geom: recoveryGeoJson
                    }])
                    .select()
                    .single();

                  if (recoveryError) {
                    console.error('Error creating recovery territory:', recoveryError);
                    Alert.alert('Error', 'Failed to create recovery territory: ' + recoveryError.message);
                    return;
                  }

                  recoveryTerritoryId = recoveryTerritory.id;
                  console.log('Created recovery territory with ID:', recoveryTerritoryId);

                  // Assign the manager to the recovery territory
                  const { error: managerAssignError } = await supabase
                    .from('users_join_territories')
                    .insert([{
                      uid: userData.user.id,
                      territory_id: recoveryTerritoryId,
                      created_at: new Date()
                    }]);

                  if (managerAssignError) {
                    console.error('Error assigning manager to recovery territory:', managerAssignError);
                    Alert.alert('Error', 'Failed to assign manager to recovery territory: ' + managerAssignError.message);
                    return;
                  }

                  console.log('Successfully assigned manager to recovery territory');
                }
              }

              // Step 3: Handle lead assignments - move orphaned leads to recovery territory or delete all assignments
              if (recoveryTerritoryId && orphanedLeads.length > 0) {
                // Move only the orphaned leads to the recovery territory
                const orphanedLeadIds = orphanedLeads.map(lead => lead.id);
                
                const { error: updateLeadsError } = await supabase
                  .from('leads_join_territories')
                  .update({ territory_id: recoveryTerritoryId })
                  .in('lead_id', orphanedLeadIds)
                  .eq('territory_id', editingTerritory.id);

                if (updateLeadsError) {
                  console.error('Error updating orphaned lead assignments to recovery territory:', updateLeadsError);
                  Alert.alert('Error', 'Failed to transfer orphaned leads to recovery territory: ' + updateLeadsError.message);
                  return;
                }

                console.log('Successfully transferred orphaned leads to recovery territory');
              }

              // Delete all remaining lead assignments for this territory
              const { error: deleteLeadsError } = await supabase
                .from('leads_join_territories')
                .delete()
                .eq('territory_id', editingTerritory.id);

              if (deleteLeadsError) {
                console.error('Error deleting lead-territory relationships:', deleteLeadsError);
                Alert.alert('Error', 'Failed to remove lead assignments: ' + deleteLeadsError.message);
                return;
              }

              console.log('Successfully deleted remaining lead-territory relationships');

              // Step 4: Delete user-territory relationships
              const { error: deleteUsersError } = await supabase
                .from('users_join_territories')
                .delete()
                .eq('territory_id', editingTerritory.id);

              if (deleteUsersError) {
                console.error('Error deleting user-territory relationships:', deleteUsersError);
                Alert.alert('Error', 'Failed to remove user assignments: ' + deleteUsersError.message);
                return;
              }

              console.log('Successfully deleted user-territory relationships');

              // Step 5: Delete the territory itself
              const { error: deleteTerritoryError } = await supabase
                .from('territories')
                .delete()
                .eq('id', editingTerritory.id);

              if (deleteTerritoryError) {
                console.error('Error deleting territory:', deleteTerritoryError);
                Alert.alert('Error', 'Failed to delete territory: ' + deleteTerritoryError.message);
                return;
              }

              console.log('Successfully deleted territory');

              // Success! Show confirmation and clean up
              const recoveryMessage = recoveryTerritoryId 
                ? `\n\nA recovery territory has been created containing ${orphanedLeads.length} orphaned leads and assigned to you.`
                : orphanedLeads.length === 0 
                  ? `\n\nNo recovery territory was needed - all leads were already covered by other territories.`
                  : '';
                
              Alert.alert('Success', `Territory "${editingTerritory.name}" has been successfully deleted.${recoveryMessage}`);
              
              // Reset form and close modal
              setIsAddingTerritory(false);
              setIsEditMode(false);
              setEditingTerritory(null);
              setTerritoryName('');
              setTerritoryColor('#FF0000');
              setSelectedUsers([]);
              stopDrawingMode();
              
              // Close the territories modal
              setIsTerritoriesModalVisible(false);
              setIsModalMinimized(false);
              
              // Refresh team territories and leads to reflect the changes
              if (isManager && managerModeEnabled) {
                fetchTeamTerritories();
                fetchLeads(); // Refresh leads since territory assignments changed
              }

            } catch (error) {
              console.error('Unexpected error deleting territory:', error);
              Alert.alert('Error', 'Failed to delete territory: ' + error.message);
            } finally {
              setIsSavingTerritory(false);
            }
          },
        },
      ]
    );
  }

  // Recovery Territory Management Functions
  function isRecoveryTerritory(territoryName) {
    return territoryName && territoryName.startsWith('Recovered from');
  }

  async function updateRecoveryTerritory(territoryId) {
    try {
      // Check if this is a recovery territory
      const { data: territory, error: territoryError } = await supabase
        .from('territories')
        .select('name, color')
        .eq('id', territoryId)
        .single();

      if (territoryError || !territory || !isRecoveryTerritory(territory.name)) {
        return; // Not a recovery territory, nothing to do
      }

      console.log('Updating recovery territory:', territoryId);

      // Get remaining leads in this territory
      const { data: remainingLeadAssignments, error: leadsError } = await supabase
        .from('leads_join_territories')
        .select('lead_id')
        .eq('territory_id', territoryId);

      if (leadsError) {
        console.error('Error fetching remaining leads:', leadsError);
        return;
      }

      // If no leads remain, delete the recovery territory
      if (!remainingLeadAssignments || remainingLeadAssignments.length === 0) {
        await deleteEmptyRecoveryTerritory(territoryId);
        return;
      }

      // Get the actual lead coordinates
      const leadIds = remainingLeadAssignments.map(l => l.lead_id);
      const remainingLeads = leads.filter(lead => leadIds.includes(lead.id));

      if (remainingLeads.length === 0) {
        await deleteEmptyRecoveryTerritory(territoryId);
        return;
      }

      // Recalculate the territory boundary based on remaining leads
      let newGeoJson;
      
      if (remainingLeads.length === 1) {
        // Single lead - create small circle
        const lead = remainingLeads[0];
        const radius = 0.002; // Very small radius (~200m)
        const circleCoords = [];
        const numPoints = 8;
        
        for (let i = 0; i < numPoints; i++) {
          const angle = (i * 2 * Math.PI) / numPoints;
          const lat = lead.latitude + radius * Math.cos(angle);
          const lng = lead.longitude + radius * Math.sin(angle);
          circleCoords.push({ latitude: lat, longitude: lng });
        }
        circleCoords.push(circleCoords[0]); // Close the polygon
        
        newGeoJson = {
          type: 'Polygon',
          coordinates: [circleCoords.map(coord => [coord.longitude, coord.latitude])]
        };
      } else {
        // Multiple leads - minimal bounding box
        const latitudes = remainingLeads.map(lead => lead.latitude);
        const longitudes = remainingLeads.map(lead => lead.longitude);
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        const padding = 0.001; // Very small padding (~100m)
        const boundingBoxCoords = [
          { latitude: minLat - padding, longitude: minLng - padding },
          { latitude: minLat - padding, longitude: maxLng + padding },
          { latitude: maxLat + padding, longitude: maxLng + padding },
          { latitude: maxLat + padding, longitude: minLng - padding },
          { latitude: minLat - padding, longitude: minLng - padding }
        ];

        newGeoJson = {
          type: 'Polygon',
          coordinates: [boundingBoxCoords.map(coord => [coord.longitude, coord.latitude])]
        };
      }

      // Update the territory geometry
      const { error: updateError } = await supabase
        .from('territories')
        .update({ geom: newGeoJson })
        .eq('id', territoryId);

      if (updateError) {
        console.error('Error updating recovery territory geometry:', updateError);
      } else {
        console.log(`Recovery territory ${territoryId} resized for ${remainingLeads.length} remaining leads`);
      }

    } catch (error) {
      console.error('Error updating recovery territory:', error);
    }
  }

  async function deleteEmptyRecoveryTerritory(territoryId) {
    try {
      console.log('Deleting empty recovery territory:', territoryId);

      // Delete lead-territory relationships first
      const { error: deleteLeadsError } = await supabase
        .from('leads_join_territories')
        .delete()
        .eq('territory_id', territoryId);

      if (deleteLeadsError) {
        console.error('Error deleting lead assignments for empty recovery territory:', deleteLeadsError);
      } else {
        console.log('Successfully deleted lead assignments for empty recovery territory');
      }

      // Delete user-territory relationships
      const { error: deleteUsersError } = await supabase
        .from('users_join_territories')
        .delete()
        .eq('territory_id', territoryId);

      if (deleteUsersError) {
        console.error('Error deleting user assignments for empty recovery territory:', deleteUsersError);
      } else {
        console.log('Successfully deleted user assignments for empty recovery territory');
      }

      // Delete the territory itself
      const { error: deleteTerritoryError } = await supabase
        .from('territories')
        .delete()
        .eq('id', territoryId);

      if (deleteTerritoryError) {
        console.error('Error deleting empty recovery territory:', deleteTerritoryError);
      } else {
        console.log('Successfully deleted empty recovery territory');
        
        // Refresh territories if in manager mode
        if (isManager && managerModeEnabled) {
          fetchTeamTerritories();
        }
      }

    } catch (error) {
      console.error('Error deleting empty recovery territory:', error);
    }
  }

  async function checkAndUpdateRecoveryTerritories() {
    try {
      // Get all territories for the team
      if (!userTeamRef.current) return;

      const { data: teamUsers, error: teamUsersError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('team', userTeamRef.current);

      if (teamUsersError || !teamUsers) return;

      const teamUserIds = teamUsers.map(user => user.user_id);

      const { data: teamTerritories, error: territoriesError } = await supabase
        .from('users_join_territories')
        .select('territory_id')
        .in('uid', teamUserIds);

      if (territoriesError || !teamTerritories) return;

      const territoryIds = teamTerritories.map(t => t.territory_id);

      // Get territory details to identify recovery territories
      const { data: territories, error: territoryDetailsError } = await supabase
        .from('territories')
        .select('id, name')
        .in('id', territoryIds);

      if (territoryDetailsError || !territories) return;

      // Check each recovery territory
      for (const territory of territories) {
        if (isRecoveryTerritory(territory.name)) {
          await updateRecoveryTerritory(territory.id);
        }
      }

    } catch (error) {
      console.error('Error checking recovery territories:', error);
    }
  }

  async function deleteLead() {
    if (!recentLead.current?.id) {
        console.error('No lead selected for deletion');
        return;
    }
    
    // Show confirmation dialog
    Alert.alert(
        "Delete Lead",
        "Are you sure you want to delete this lead and it's associated data? This action cannot be undone.",
        [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        // First delete related notes
                        const { error: notesError } = await supabase
                            .from('notes')
                            .delete()
                            .eq('lead_id', recentLead.current.id);

                        if (notesError) {
                            console.error('Error deleting notes:', notesError);
                            Alert.alert('Error', 'Failed to delete lead notes');
                            return;
                        }

                        // Then delete lead-territory relationships
                        const { error: joinError } = await supabase
                            .from('leads_join_territories')
                            .delete()
                            .eq('lead_id', recentLead.current.id);

                        if (joinError) {
                            console.error('Error deleting lead-territory relationships:', joinError);
                            Alert.alert('Error', 'Failed to delete lead-territory relationships');
                            return;
                        }

                        // Finally delete the lead itself
                        const { error: leadError } = await supabase
                            .from('leads')
                            .delete()
                            .eq('id', recentLead.current.id);

                        if (leadError) {
                            console.error('Error deleting lead:', leadError);
                            Alert.alert('Error', 'Failed to delete lead');
                            return;
                        }

                        // Close the big menu and refresh the leads list
                        closeBigMenu();
                        await fetchLeads();
                    } catch (error) {
                        console.error('Error in deleteLead:', error);
                        Alert.alert('Error', 'An unexpected error occurred while deleting the lead');
                    } finally {
                        // Delete operation completed
                    }
                }
            }
        ]
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {memoizedMap}
        
        {/* White background overlay when keyboard is visible */}
        {isKeyboardVisible && (
          <View 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: keyboardHeight + 150, // Extra height to cover menu area
              backgroundColor: 'white',
              zIndex: 40, // Below the menu but above the map
            }}
          />
        )}
        
        {renderDrawer()}
        {renderNoteModal()}
        {renderFullNotesModal()}
        
        {/* Safe Area for Top Buttons - only affects top edge */}
        <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 12 }} edges={['top']}>
          {/* Remove the first Create New Lead button */}

          {/* Hamburger Menu */}
          <View className="absolute top-2 left-4 z-10">
            <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)}>
              <View className="w-6 h-5 justify-between">
                <View className="w-full h-0.5 bg-gray-800 opacity-25" />
                <View className="w-full h-0.5 bg-gray-800 opacity-25" />
                <View className="w-full h-0.5 bg-gray-800 opacity-25" />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Manager Mode Badge */}
          {isManager && managerModeEnabled && (
            <View className="absolute top-2 left-16 z-10 bg-purple-600 px-3 py-1 rounded-full">
              <Text className="text-white font-semibold text-xs">Manager Mode</Text>
            </View>
          )}
          
          {/* Territory Management Button (Only visible in manager mode) */}
          {isManager && managerModeEnabled && (
            <TouchableOpacity
              className="absolute top-10 left-5 z-10 bg-gray-800 p-2 rounded-full shadow-md"
              onPress={() => {
                setIsTerritoriesModalVisible(true);
                setIsModalMinimized(false);
                fetchTeamUsers();
              }}
            >
              <Image 
                source={require('../../assets/images/territory.png')} 
                className="w-6 h-6" 
              />
            </TouchableOpacity>
          )}

          {/* Drawing Mode Instructions */}
          {isDrawingMode && (
            <View className="absolute top-10 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-20">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Territory Drawing Mode</Text>
          <Text className="text-gray-700 text-sm mb-2">
            Tap on the map to add boundary points ({polygonCoordinates.length} points added)
          </Text>
          <Text className="text-gray-600 text-xs mb-3">
            {polygonCoordinates.length < 3 
              ? `Need ${3 - polygonCoordinates.length} more points to complete`
              : 'Ready to complete polygon'
            }
          </Text>
          
          {/* Action Buttons */}
          <View className="flex-row space-x-2">
            {polygonCoordinates.length >= 3 && (
              <TouchableOpacity 
                className="flex-1 bg-green-600 py-2 px-3 rounded-lg"
                onPress={() => {
                  completePolygon();
                  setIsModalMinimized(false); // Maximize the bottom sheet
                }}
              >
                <Text className="text-white font-medium text-center">Complete Polygon</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              className="flex-1 bg-red-600 py-2 px-3 rounded-lg"
              onPress={() => {
                cancelDrawing();
                setIsModalMinimized(false); // Maximize the bottom sheet
              }}
            >
              <Text className="text-white font-medium text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

          {/* Right-side buttons */}
          {/* Crosshair */}
          {!startSaleModal && (
            <View className="absolute top-2 right-4 items-center">
              <TouchableOpacity
                className="bg-transparent p-0.5 rounded-full border border-black opacity-25"
                onPress={centerMapOnUserLocation}
              >
                <Image source={require('../../assets/images/crosshair.png')} className="w-7 h-7" />
              </TouchableOpacity>
            </View>
          )}

          {/* Filter Button */}
          {!startSaleModal && (
            <View className="absolute top-12 right-4 items-center">
              <TouchableOpacity
                className={`p-0.5 rounded-full border border-black ${
                  selectedStatuses.length < 6 
                    ? 'bg-blue-600 opacity-90' 
                    : 'bg-transparent opacity-25'
                }`}
                onPress={() => setIsFiltersModalVisible(true)}
              >
                <Image source={require('../../assets/images/funnel-icon.png')} className="w-7 h-7" />
              </TouchableOpacity>
            </View>
          )}

          {/* Manager Mode Button - Only visible for managers */}
          {!startSaleModal && isManager && (
            <View className="absolute top-24 right-4 items-center">
              <TouchableOpacity
                className={`p-0.5 rounded-full border border-black ${
                  managerModeEnabled 
                    ? 'bg-purple-600 opacity-90' 
                    : 'bg-transparent opacity-25'
                }`}
                onPress={() => setManagerModeEnabled(!managerModeEnabled)}
              >
                <View className="w-7 h-7 items-center justify-center">
                  <Text className={`text-xs font-bold ${
                    managerModeEnabled ? 'text-white' : 'text-black'
                  }`}>M</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      
      {/* Settings Modal */}
      <Modal
      animationType="slide"
      transparent={false}
      visible={isSettingsModalVisible}
      onRequestClose={() => setIsSettingsModalVisible(false)}
      statusBarTranslucent={false} // Ensures the modal covers the status bar
    >
      {/* Status Bar Styling */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="#121212" // Dark background for the status bar
      />

      <View className="flex-1 bg-gray-900 px-6 pt-8 pb-8">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-semibold text-white">Settings</Text>
          <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)}>
            <Text className="text-xl font-semibold text-white">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Content */}
        <View className="space-y-6">
          {/* Edit Filters and Satellite View Row */}
          <View className="flex-row space-x-3">
            {/* Edit Filters Button - Left Half */}
            <TouchableOpacity
              className="flex-1 p-3 bg-gray-800 rounded-lg items-center justify-center"
              onPress={() => setIsFiltersModalVisible(true)}
            >
              <Text className="text-md text-gray-200 font-medium">Edit Filters</Text>
            </TouchableOpacity>
            
            {/* Satellite View Toggle - Right Half */}
            <View className="flex-1 flex-row items-center justify-between p-3 bg-gray-800 rounded-lg">
              <Text className="text-md text-gray-200">Satellite View</Text>
              <Switch
                value={isSatellite}
                onValueChange={(value) => setIsSatellite(value)}
                thumbColor={isSatellite ? '#4ADE80' : '#f4f3f4'}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
              />
            </View>
          </View>



          {/* Credential Type Selection */}
          <View>
            <View className="flex-row justify-around">
              {/* ASAP Button */}
              <TouchableOpacity
                className={`flex-1 mr-2 p-3 rounded-lg items-center ${
                  credentialType === 'ASAP' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                onPress={() => setCredentialType('ASAP')}
              >
                <Text
                  className={`text-sm ${
                    credentialType === 'ASAP' ? 'text-white font-semibold' : 'text-gray-300 font-medium'
                  }`}
                >
                  ASAP
                </Text>
              </TouchableOpacity>

              {/* BASS Button */}
              <TouchableOpacity
                className={`flex-1 ml-2 p-3 rounded-lg items-center ${
                  credentialType === 'BASS' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                onPress={() => setCredentialType('BASS')}
              >
                <Text
                  className={`text-sm ${
                    credentialType === 'BASS' ? 'text-white font-semibold' : 'text-gray-300 font-medium'
                  }`}
                >
                  BASS
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credentials Section */}
          <View>
            <TouchableOpacity
              className={`p-3 rounded-lg flex-row items-center justify-center ${
                showCredentialsRef.current ? 'bg-gray-700' : 'bg-blue-600'
              }`}
              onPress={toggleCredentialsInputs}
            >
              <Text className="text-white font-semibold text-center text-sm">
                {showCredentialsRef.current
                  ? 'Hide Credentials'
                  : `Securely Add ${credentialType} Credentials`}
              </Text>
            </TouchableOpacity>

            {showCredentialsRef.current && (
              <View className="mt-6 space-y-4">
                {credentialType === 'ASAP' && (
                  <>
                    <TextInput
                      className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                      placeholder="Enter ASAP Username"
                      placeholderTextColor="#A1A1AA"
                      onChangeText={(text) => (uasapRef.current = text)}
                      autoCapitalize="none"
                    />
                    <TextInput
                      className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                      placeholder="Enter ASAP Password"
                      secureTextEntry
                      placeholderTextColor="#A1A1AA"
                      onChangeText={(text) => (pasapRef.current = text)}
                      autoCapitalize="none"
                    />
                  </>
                )}
                {credentialType === 'BASS' && (
                  <>
                    <TextInput
                      className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                      placeholder="Enter BASS Username"
                      placeholderTextColor="#A1A1AA"
                      onChangeText={(text) => (ubassRef.current = text)}
                      autoCapitalize="none"
                    />
                    <TextInput
                      className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                      placeholder="Enter BASS Password"
                      secureTextEntry
                      placeholderTextColor="#A1A1AA"
                      onChangeText={(text) => (pbassRef.current = text)}
                      autoCapitalize="none"
                    />
                  </>
                )}
                <TouchableOpacity
                  className="bg-blue-500 p-3 rounded-lg shadow"
                  onPress={saveCredentialsToDatabase}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Save
                  </Text>
                </TouchableOpacity>
                {saveMessage && (
                  <Text className="text-green-400 text-center text-xs">
                    {saveMessage}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Logout Button */}
        <View className="absolute bottom-10 left-6">
          <TouchableOpacity
            className="bg-blue-600 p-3 rounded-lg shadow w-40 flex-row items-center justify-center"
            onPress={handleLogout}
          >
            <Text className="text-white font-semibold text-center text-sm">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Filters Modal */}
    <Modal
      animationType="slide"
      transparent={false}
      visible={isFiltersModalVisible}
      onRequestClose={() => setIsFiltersModalVisible(false)}
      statusBarTranslucent={false}
    >
      {/* Status Bar Styling */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="#121212"
      />

      <View className="flex-1 bg-gray-900 px-3 py-8">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-semibold text-white">Filters</Text>
          <TouchableOpacity onPress={() => setIsFiltersModalVisible(false)}>
            <Text className="text-xl font-semibold text-white">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Filters Content */}
        <View className="space-y-6">
          {/* Status Filters */}
          <View className="p-4 bg-gray-800 rounded-lg">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg text-white font-semibold">Lead Status Filters</Text>
              <TouchableOpacity
                className="bg-blue-600 px-3 py-1.5 rounded-md"
                onPress={() => {
                  // If all are selected, deselect all. Otherwise, select all.
                  if (selectedStatuses.length === 6) {
                    setSelectedStatuses([]);
                  } else {
                    setSelectedStatuses([0, 1, 2, 3, 4, 5]);
                  }
                }}
              >
                <Text className="text-white text-xs font-medium">
                  {selectedStatuses.length === 6 ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-400 mb-4">Select which lead statuses to show on the map</Text>
            
            <View className="flex-row justify-between">
              {['New', 'Gone', 'Later', 'Nope', 'Sold', 'Return'].map((status, index) => {
                const colors = ['#800080', '#FFD700', '#1E90FF', '#FF6347', '#32CD32', '#00008B'];
                const isSelected = selectedStatuses.includes(index);
                
                return (
                  <TouchableOpacity
                    key={index}
                    className={`items-center p-2 rounded-lg flex-1 mx-0.25 ${
                      isSelected ? 'bg-gray-700' : ''
                    }`}
                    onPress={() => {
                      setSelectedStatuses(prev => 
                        prev.includes(index) 
                          ? prev.filter(s => s !== index)
                          : [...prev, index]
                      );
                    }}
                  >
                    <View 
                      style={{ backgroundColor: colors[index] }} 
                      className="h-3 w-full rounded mb-2" 
                    />
                    <Text className={`text-xs text-center ${
                      isSelected ? 'text-white font-medium' : 'text-gray-400'
                    }`}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View className="absolute bottom-8 left-6 right-6">
          <TouchableOpacity
            className="bg-blue-600 p-4 rounded-lg shadow"
            onPress={() => {
              setIsFiltersModalVisible(false);
              setIsSettingsModalVisible(false); // Close settings modal too
              // The filtering will happen automatically through the updated selectedStatuses state
            }}
          >
            <Text className="text-white font-semibold text-center text-lg">
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>


    {/* Start Sale Modal */}
    {startSaleModal && (
  <Modal
    animationType="slide"
    transparent={false}
    visible={startSaleModal}
    onRequestClose={() => setStartSaleModal(false)}
    statusBarTranslucent={false}
  >
    {/* Status Bar Styling */}
    <StatusBar
      barStyle="light-content"
      backgroundColor="#121212" // Dark background for the status bar
    />

    <View className="flex-1 bg-white">
      {/* Header Bar */}
      <View className="flex-row justify-between items-center px-6 py-2 bg-gray-900">
        <Text className="text-xl font-semibold text-white"></Text>
        <TouchableOpacity onPress={() => setStartSaleModal(false)} accessibilityLabel="Close Start Sale" accessible={true}>
          <Text className="text-xl font-bold text-gray-200 pt-2">✕</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={(r) => (this.webref = r)}
        source={{
          uri:
            credentialType === 'ASAP'
              ? 'https://asap.docxtract.com/Login.aspx'
              : 'https://bass.docxtract.com/Login.aspx',
        }}
        scalesPageToFit={false} // Allows scaling (if supported in your version)
        injectedJavaScript={`
          const meta = document.createElement('meta'); 
          meta.setAttribute('name', 'viewport'); 
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=10, minimum-scale=0.1, user-scalable=yes');
          document.getElementsByTagName('head')[0].appendChild(meta);
        `}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onNavigationStateChange={(navState) => {
          const currentUrl = navState.url;
          console.log('Navigated to:', currentUrl);

          if (currentUrl.includes('Login.aspx')) {
            // injectLogin();
            console.log("we here");
          } else if (currentUrl.includes('SimHomePage.aspx')) {
            injectNavigate();
          } else if (currentUrl.includes('PrequalOrder.aspx')) {
            injectFill();
          } else if (currentUrl.includes('PxCTLChooseService.aspx')) {
            injectFill2();
          } else if (currentUrl.includes('PxCTLConfigureServicesDOB.aspx')) {
            injectDob();
          } else if (currentUrl.includes('PxCTLConfigureServices.aspx')) {
            injectOptions();
          } else if (currentUrl.includes('PxCTLCustomerInformation.aspx')) {
            injectEmail();
          } else if (currentUrl.includes('PxCTLReviewandVerificationOrder.aspx')) {
            injectContinue();
          } else {
            console.log('No script to inject for this URL.');
          }
        }}
      />

      {/* Bottom Button Bar */}
      <View className="flex-row justify-between px-6 py-4 bg-gray-900">
        <TouchableOpacity
          onPress={injectLogin}
          className="bg-blue-500 py-2.5 px-4 rounded flex-1 mx-1"
        >
          <Text className="text-white font-bold text-center">Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={injectConfirm}
          className="bg-blue-500 py-2.5 px-4 rounded flex-1 mx-1"
        >
          <Text className="text-white font-bold text-center">Confirm</Text>
        </TouchableOpacity>        
        <TouchableOpacity
          onPress={() => {
            if (this.webref) {
              this.webref.injectJavaScript('window.location.reload();');
            }
          }}
          className="bg-blue-500 py-2.5 px-4 rounded flex-1 mx-1"
        >
          <Text className="text-white font-bold text-center">Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}

    {/* Territory Management Modal */}
    {isTerritoriesModalVisible && (
      <>
        {/* Semi-transparent overlay - only show when not minimized */}
        {!isModalMinimized && (
          <TouchableOpacity 
            className="absolute inset-0 bg-black bg-opacity-20 z-40"
            activeOpacity={1}
            onPress={() => setIsModalMinimized(true)}
          />
        )}
        
        {/* Bottom sheet */}
        <View
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 ${isModalMinimized ? 'shadow-lg' : ''}`}
          style={{ 
            height: isModalMinimized ? 60 : Math.min(height * 0.8, height * 0.5),
            maxHeight: isModalMinimized ? 60 : height * 0.8,
            minHeight: isModalMinimized ? 60 : height * 0.5
          }}
        >
          {/* Handle Bar */}
          <TouchableOpacity 
            className="w-12 h-1 bg-gray-300 rounded-full self-center mt-3 mb-2"
            onPress={() => {
              if (isModalMinimized) {
                setIsModalMinimized(false);
              } else {
                setIsTerritoriesModalVisible(false);
                setIsModalMinimized(false);
                stopDrawingMode(); // Clean up drawing mode when closing modal
              }
            }}
          />
          
          {/* Header */}
          <TouchableOpacity
            className="flex-row justify-between items-center px-6 py-2"
            activeOpacity={isModalMinimized ? 0.7 : 1}
            onPress={() => {
              if (isModalMinimized) {
                setIsModalMinimized(false);
              }
            }}
            disabled={!isModalMinimized}
          >
            <Text className="text-lg font-semibold text-gray-900">
              {isModalMinimized ? "Territory Management" : "Territory Management"}
            </Text>
            {!isModalMinimized && (
              <TouchableOpacity onPress={() => {
                setIsTerritoriesModalVisible(false);
                setIsModalMinimized(false);
                stopDrawingMode(); // Clean up drawing mode when closing modal
              }}>
                <Text className="text-2xl font-bold text-gray-400">✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Content - only show when not minimized */}
          {!isModalMinimized && (
            <>
              <View className="border-t border-gray-200" />
              <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
                <View className="space-y-4">
                  {!isAddingTerritory ? (
                    <>
                      {/* Add Territory Button */}
                      <TouchableOpacity 
                        className="bg-blue-600 py-3 px-4 rounded-lg"
                        onPress={() => setIsAddingTerritory(true)}
                      >
                        <Text className="text-white font-semibold text-center">Add New Territory</Text>
                      </TouchableOpacity>

                      {/* Territories List */}
                      <Text className="text-lg font-semibold text-gray-900 mt-6">Team Territories</Text>
                      
                      {teamTerritories.length > 0 ? (
                        teamTerritories.map((territory) => (
                          <View key={territory.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center flex-1">
                                <View 
                                  className="w-4 h-4 rounded-full mr-3" 
                                  style={{ backgroundColor: territory.color }}
                                />
                                <Text className="text-base font-medium text-gray-900 flex-1">
                                  {territory.name}
                                </Text>
                              </View>
                              <TouchableOpacity 
                                className="bg-blue-500 px-3 py-1 rounded"
                                onPress={() => startEditTerritory(territory)}
                              >
                                <Text className="text-white text-sm font-medium">Edit</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <Text className="text-gray-500 text-center">No territories found for this team</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Add Territory Form */}
                      <View className="flex-row items-center mb-4">
                        <TouchableOpacity 
                          onPress={cancelTerritoryForm}
                          className="mr-3"
                        >
                          <Text className="text-blue-600 text-lg">← Back</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-semibold text-gray-900">
                          {isEditMode ? 'Edit Territory' : 'Add New Territory'}
                        </Text>
                      </View>

                      {/* Territory Name Input */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Territory Name</Text>
                        <TextInput
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-base"
                          placeholder="Enter territory name"
                          value={territoryName}
                          onChangeText={setTerritoryName}
                        />
                      </View>

                      {/* Territory Color Picker */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Territory Color</Text>
                        <View className="flex-row flex-wrap">
                          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'].map((color) => (
                            <TouchableOpacity
                              key={color}
                              className={`w-10 h-10 rounded-full border-2 mr-3 mb-3 ${territoryColor === color ? 'border-gray-900' : 'border-gray-300'}`}
                              style={{ backgroundColor: color }}
                              onPress={() => setTerritoryColor(color)}
                            />
                          ))}
                        </View>
                      </View>

                      {/* Drawing Controls */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">Territory Boundary</Text>
                        
                        {!isDrawingMode ? (
                          <View className="space-y-3">
                            {polygonCoordinates.length === 0 ? (
                              <TouchableOpacity 
                                className="bg-green-600 py-3 px-4 rounded-lg"
                                onPress={startDrawingMode}
                              >
                                <Text className="text-white font-semibold text-center">Start Drawing Territory</Text>
                              </TouchableOpacity>
                            ) : (
                              <View className="space-y-2">
                                <View className="bg-green-50 p-3 rounded-lg border border-green-200">
                                  <Text className="text-green-800 font-medium">
                                    Territory drawn with {polygonCoordinates.length} points
                                  </Text>
                                </View>
                                <View className="flex-row space-x-2">
                                  <TouchableOpacity 
                                    className="flex-1 bg-blue-600 py-2 px-3 rounded-lg"
                                    onPress={startDrawingMode}
                                  >
                                    <Text className="text-white font-medium text-center">Redraw</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    className="flex-1 bg-gray-600 py-2 px-3 rounded-lg"
                                    onPress={clearPolygon}
                                  >
                                    <Text className="text-white font-medium text-center">Clear</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <Text className="text-yellow-800 font-medium mb-2">Drawing Mode Active</Text>
                            <Text className="text-yellow-700 text-sm mb-1">
                              Drawing in progress... Use the controls in the floating panel above to complete or cancel.
                            </Text>
                            <Text className="text-yellow-700 text-sm">
                              Current points: {polygonCoordinates.length}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* User Selection */}
                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                          Assign Users ({selectedUsers.length} selected)
                        </Text>
                        {teamUsers.map((user) => (
                          <TouchableOpacity
                            key={user.user_id}
                            className={`flex-row items-center justify-between p-3 rounded-lg border mb-2 ${
                              selectedUsers.includes(user.user_id)
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-300'
                            }`}
                            onPress={() => {
                              if (selectedUsers.includes(user.user_id)) {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                              } else {
                                setSelectedUsers([...selectedUsers, user.user_id]);
                              }
                            }}
                          >
                            <View>
                              <Text className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </Text>
                              <Text className="text-sm text-gray-500">{user.user_type || 'User'}</Text>
                            </View>
                            {selectedUsers.includes(user.user_id) && (
                              <Text className="text-blue-600 font-bold">✓</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Save Button */}
                      <TouchableOpacity 
                        className={`py-3 px-4 rounded-lg mb-6 ${isSavingTerritory ? 'bg-gray-400' : 'bg-green-600'}`}
                        onPress={saveTerritory}
                        disabled={isSavingTerritory}
                      >
                        <View className="flex-row items-center justify-center">
                          {isSavingTerritory && (
                            <ActivityIndicator size="small" color="white" className="mr-2" />
                          )}
                          <Text className="text-white font-semibold text-center">
                            {isSavingTerritory 
                              ? (isEditMode ? 'Updating Territory...' : 'Saving Territory...')
                              : (isEditMode ? 'Update Territory' : 'Save Territory')
                            }
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Delete Button - Only show in edit mode */}
                      {isEditMode && (
                        <TouchableOpacity 
                          className={`py-3 px-4 rounded-lg mb-6 ${isSavingTerritory ? 'bg-gray-400' : 'bg-red-600'}`}
                          onPress={deleteTerritory}
                          disabled={isSavingTerritory}
                        >
                          <View className="flex-row items-center justify-center">
                            {isSavingTerritory && (
                              <ActivityIndicator size="small" color="white" className="mr-2" />
                            )}
                            <Text className="text-white font-semibold text-center">
                              {isSavingTerritory ? 'Deleting Territory...' : 'Delete Territory'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </>
    )}

    {/* Big Menu Modal */}
    {bigMenu && (
      <Modal
        animationType="slide"
        transparent={false}
        visible={bigMenu}
        onRequestClose={closeBigMenu}
        statusBarTranslucent={false}
      >
        {/* Status Bar Styling */}
        <StatusBar
          barStyle="light-content"
          backgroundColor="#121212" // Dark background for the status bar
        />

        <View className="flex-1 bg-gray-900 px-6 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-semibold text-white">Lead Information</Text>
            <TouchableOpacity onPress={closeBigMenu} accessibilityLabel="Close Menu" accessible={true}>
              <Text className="text-2xl font-bold text-gray-200">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <ScrollView className="flex-1">
            <View className="space-y-4">
              <TextInput
                className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                placeholder="First Name"
                defaultValue={firstName.current}
                onChangeText={(text) => (firstName.current = text)}
                placeholderTextColor="#A1A1AA"
                autoCapitalize="words"
              />
              <TextInput
                className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                placeholder="Last Name"
                defaultValue={lastName.current}
                onChangeText={(text) => (lastName.current = text)}
                placeholderTextColor="#A1A1AA"
                autoCapitalize="words"
              />
              <TextInput
                className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                placeholder="Date of Birth (MM/DD/YYYY)"
                defaultValue={dob.current}
                onChangeText={(text) => (dob.current = text)}
                keyboardType="numeric"
                placeholderTextColor="#A1A1AA"
                maxLength={10}
              />
              <TextInput
                className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                placeholder="Phone"
                defaultValue={phone.current}
                onChangeText={(text) => (phone.current = text)}
                keyboardType="phone-pad"
                placeholderTextColor="#A1A1AA"
              />
              <TextInput
                className="bg-gray-800 text-gray-200 placeholder-gray-400 rounded-lg border border-gray-700 py-3 px-4 text-sm"
                placeholder="Email"
                defaultValue={email.current}
                onChangeText={(text) => (email.current = text)}
                keyboardType="email-address"
                placeholderTextColor="#A1A1AA"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => deleteLead()}
                className="bg-red-600 px-4 py-2 rounded-lg self-start"
              >
                <Text className="text-white font-semibold">Delete Lead</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Start Sale Button */}
          <TouchableOpacity
            className="bg-blue-600 py-3 rounded-lg mt-6 items-center shadow"
            onPress={startSale}
            accessibilityLabel="Start Sale"
            accessible={true}
          >
            <Text className="text-white text-lg font-semibold">Start Sale</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )}





    {/* Create New Lead Button */}
    {showNewLeadButton && newLeadButtonPosition && (
      <TouchableOpacity
        className="absolute z-50 bg-blue-500 px-4 py-2 rounded-lg shadow-lg"
        style={{
          left: newLeadButtonPosition.x,
          top: newLeadButtonPosition.y,
          transform: [
            { translateX: -64 },
            { translateY: -50 }
          ]
        }}
        onPress={() => {
          createNewLead(newLeadCoordinate);
          setShowNewLeadButton(false);
        }}
      >
        <Text className="text-white font-semibold">+New Lead</Text>
      </TouchableOpacity>
    )}


      </View>
    </View>
  );
}