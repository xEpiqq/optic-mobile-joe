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
  Alert
} from 'react-native';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import MapView, { PROVIDER_GOOGLE, Marker, Polygon } from 'react-native-maps';
import { useClusterer } from 'react-native-clusterer';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useSupabase } from '../../contexts/SupabaseContext';
import { GOOGLE_MAPS_API_KEY } from '../../config';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIAL_TYPE_KEY = 'CREDENTIAL_TYPE'; 


const { width, height } = Dimensions.get('window');
const MAP_DIMENSIONS = { width, height };
const BUFFER_FACTOR = 2;

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
  const [noteText, setNoteText] = useState('');
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
  const [showAddressValidation, setShowAddressValidation] = useState(false);
  const [newLeadAddress, setNewLeadAddress] = useState('');
  const [newLeadId, setNewLeadId] = useState(null);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [validationPosition, setValidationPosition] = useState({ x: 0, y: 0 });
  const [editableAddress, setEditableAddress] = useState('');

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

  // Center map on user location once available and map is ready
  useEffect(() => {
    if ((userLocation || optimisticLocation) && isMapReady && mapRef.current) {
      centerMapOnUserLocation();
    }
  }, [userLocation, optimisticLocation, isMapReady]);

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

  async function fetchLeads() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    
    try {
      let leadsData = [];
      
      // Get all territory IDs associated with the current user
      const { data: userTerritories, error: userTerritoriesError } = await supabase
        .from('users_join_territories')
        .select('territory_id')
        .eq('uid', userData.user.id);
      
      if (userTerritoriesError) {
        console.error('Error fetching user territories:', userTerritoriesError);
        return;
      }
      
      if (!userTerritories || userTerritories.length === 0) {
        console.log('No territories assigned to this user');
        setLeads([]);
        return;
      }
      
      // Extract territory IDs
      const territoryIds = userTerritories.map(territory => territory.territory_id);
      console.log(`Fetching leads for ${territoryIds.length} territories`);
      
      // Get all lead IDs associated with these territories - CHUNKED
      let allTerritoryLeads = [];
      const territoryChunks = chunkArray(territoryIds, 200);
      
      for (const chunk of territoryChunks) {
        const { data: territoryLeads, error: territoryLeadsError } = await supabase
          .from('leads_join_territories')
          .select('lead_id, territory_id')
          .in('territory_id', chunk);
        
        if (territoryLeadsError) {
          console.error('Error fetching territory leads chunk:', territoryLeadsError);
          return;
        }
        
        if (territoryLeads) {
          allTerritoryLeads = [...allTerritoryLeads, ...territoryLeads];
        }
      }
      
      if (allTerritoryLeads.length === 0) {
        console.log('No leads found in user territories');
        setLeads([]);
        return;
      }
      
      // Extract lead IDs
      const leadIds = allTerritoryLeads.map(lead => lead.lead_id);
      console.log(`Fetching ${leadIds.length} leads`);
      
      // Fetch the actual lead data - CHUNKED
      let allLeads = [];
      const leadChunks = chunkArray(leadIds, 200);
      
      for (const chunk of leadChunks) {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, location, status, knocks, user_id')
          .in('id', chunk);
        
        if (leadsError) {
          console.error('Error fetching leads chunk:', leadsError);
          return;
        }
        
        if (leads) {
          allLeads = [...allLeads, ...leads];
        }
      }
      
      leadsData = [...allLeads];
      
      // If manager mode is enabled and user has a team, fetch team leads
      if (isManager && managerModeEnabled && userTeamRef.current) {
        // First get all users in the same team
        const { data: teamUsers, error: teamUsersError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('team', userTeamRef.current)
          .neq('user_id', userData.user.id); // Exclude the current user
        
        if (teamUsersError) {
          console.error('Error fetching team users:', teamUsersError);
        } else if (teamUsers && teamUsers.length > 0) {
          // Get all territory IDs for team members - CHUNKED
          const teamUserIds = teamUsers.map(user => user.user_id);
          let allTeamTerritories = [];
          const userChunks = chunkArray(teamUserIds, 200);
          
          for (const chunk of userChunks) {
            const { data: teamTerritories, error: teamTerritoriesError } = await supabase
              .from('users_join_territories')
              .select('territory_id')
              .in('uid', chunk);
            
            if (teamTerritoriesError) {
              console.error('Error fetching team territories chunk:', teamTerritoriesError);
            } else if (teamTerritories) {
              allTeamTerritories = [...allTeamTerritories, ...teamTerritories];
            }
          }
          
          // Get leads for team territories
          if (allTeamTerritories.length > 0) {
            const territoryIds = allTeamTerritories.map(t => t.territory_id);
            const { data: teamLeads, error: teamLeadsError } = await supabase
              .from('leads_join_territories')
              .select('lead_id')
              .in('territory_id', territoryIds);
            
            if (teamLeadsError) {
              console.error('Error fetching team leads:', teamLeadsError);
            } else if (teamLeads) {
              const teamLeadIds = teamLeads.map(l => l.lead_id);
              const { data: teamLeadData, error: teamLeadDataError } = await supabase
                .from('leads')
                .select('id, location, status, knocks, user_id')
                .in('id', teamLeadIds);
              
              if (teamLeadDataError) {
                console.error('Error fetching team lead data:', teamLeadDataError);
              } else if (teamLeadData) {
                leadsData = [...leadsData, ...teamLeadData];
              }
            }
          }
        }
      }
      
      // Format leads for the map
      const formattedLeads = leadsData.map((lead) => ({
        ...lead,
        latitude: lead.location?.coordinates?.[1],
        longitude: lead.location?.coordinates?.[0],
        // Only mark as team lead if in manager mode AND the lead belongs to someone else's territory
        // For now, we'll determine this based on whether it was fetched from team territories vs user territories
        isTeamLead: isManager && managerModeEnabled && lead.user_id !== userData.user.id
      }));
      
      console.log(`Successfully loaded ${formattedLeads.length} leads`);
      setLeads(formattedLeads);
    } catch (error) {
      console.error('Unexpected error fetching leads:', error);
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

    setIsClustering(newRegion.latitudeDelta >= 0.1);
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
    // Get the lead to check if it's editable
    const lead = leads.find(l => l.id === leadId);
    
    // Only block editing if it's a team lead in manager mode (leads from other territories)
    if (lead && lead.isTeamLead && isManager && managerModeEnabled) {
      console.log('Cannot update status of team leads from other territories');
      return;
    }
    
    // Optimistic state update for immediate visual feedback
    setLeads((prevLeads) =>
      prevLeads.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating lead status:', error);
        // Revert state change on error
        fetchLeads();
      }
    } catch (error) {
      console.error('Unexpected error updating lead status:', error);
      // Fallback fetch if something goes wrong
      fetchLeads();
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
    fetchAllNotes(leadId);
    setIsFullNotesModalVisible(true);
  }

  async function fetchAllNotes(leadId) {
    const { data, error } = await supabase
      .from('notes')
      .select('note, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all notes:', error);
      setAllNotes([]);
    } else {
      setAllNotes(data);
    }
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

  function showMenu(lead, event) {
    if (recentNote !== '') setRecentNote('');
    recentLead.current = lead;

    const { coordinate } = event.nativeEvent;
    mapRef.current.pointForCoordinate(coordinate).then((point) => {
      const x = point.x - width / 2;
      const y = point.y - height / 2;
      selectedLead.current = lead;
      fetchMostRecentNote(lead.id);
      fetchLeadAddress(lead.id);
      setMenuPosition({ x, y: y - 100 });
    });
  }

  function showBigMenu(lead) {
    // Only block big menu for team leads in manager mode (leads from other territories)
    if (lead.isTeamLead && isManager && managerModeEnabled) {
      return;
    }
    
    selectedLead.current = lead;
    setBigMenu(true);
    handleDragStart(lead);
  }

  function closeBigMenu() {
    setBigMenu(false);
    selectedLead.current = null;
    firstName.current = '';
    lastName.current = '';
    phone.current = '';
    email.current = '';
  }

  async function handleDragStart(lead) {
    recentLead.current = lead;
    setBigMenu(true);

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

  function handleDragEnd(lead, event) {
    // Handle drag end if needed
  }

  async function addNote() {
    const trimmedNote = noteText.trim();
    if (trimmedNote === '') return;

    setRecentNote({ note: trimmedNote, created_at: new Date().toISOString() });
    setNoteText('');
    setIsNoteModalVisible(false);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { error } = await supabase.from('notes').insert({
      lead_id: recentLead.current.id,
      note: trimmedNote,
      created_by: userData.user.id,
    });

    if (error) {
      console.error('Error adding note:', error);
      setRecentNote(null);
    }
    setDummyRender((prev) => !prev);
  }

  function formatDob(dob) {
    if (dob && dob.length === 8 && !dob.includes('/')) {
      return `${dob.slice(0, 2)}/${dob.slice(2, 4)}/${dob.slice(4, 8)}`;
    }
    return dob;
  }

  async function startSale() {
    setStartSaleModal(true);
    setBigMenu(false);

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

    const { error: insertError } = await supabase
      .from('leads')
      .update({
        first_name: firstName.current.trim(),
        last_name: lastName.current.trim(),
        email: email.current.trim(),
        phone: phone.current.trim(),
        dob: dob.current.trim(),
      })
      .eq('id', recentLead.current.id);

    if (insertError) console.error('Error inserting lead information:', insertError);
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

  function centerMapOnUserLocation() {
    const locationToUse = userLocation || optimisticLocation;

    if (mapRef.current && locationToUse) {
      mapRef.current.animateToRegion({
        latitude: locationToUse.latitude,
        longitude: locationToUse.longitude,
        latitudeDelta: 0.05, // Use a closer zoom when centering on user
        longitudeDelta: 0.05,
      }, 1000); // Add duration for smoother animation
    } else {
      console.error('User location or map not available');
    }
  }

  function getVisibleLeads() {
    if (!region) return [];
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

    const bufferedLatDelta = latitudeDelta * BUFFER_FACTOR;
    const bufferedLngDelta = longitudeDelta * BUFFER_FACTOR;

    const minLat = latitude - bufferedLatDelta / 2;
    const maxLat = latitude + bufferedLatDelta / 2;
    const minLng = longitude - bufferedLngDelta / 2;
    const maxLng = longitude + bufferedLngDelta / 2;

    return leads.filter(
      (lead) =>
        lead.latitude >= minLat &&
        lead.latitude <= maxLat &&
        lead.longitude >= minLng &&
        lead.longitude <= maxLng
    );
  }

  const visibleLeads = getVisibleLeads();

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
      },
    }));
  }, [visibleLeads]);

  const [clusteredPoints, supercluster] = useClusterer(
    isClustering ? geoJSONLeads : [],
    MAP_DIMENSIONS,
    region,
    {
      minZoom: 0,
      maxZoom: 12,
      minPoints: 2,
      radius: 40,
    }
  );

  function renderStatusMenu() {
    if (!selectedLead.current) return null;

    const statuses = ['New', 'Gone', 'Later', 'Nope', 'Sold', 'Return'];
    const colors = ['#800080', '#FFD700', '#1E90FF', '#FF6347', '#32CD32', '#00008B'];

    return (
      <>
        {!bigMenu && (
          <View>
            {leadAddress && (
              <View className="absolute bottom-0 right-0 z-50 p-2.5 px-3 bg-white rounded flex-row items-center">
                <Text className="text-black font-bold text-base flex-1">{leadAddress}</Text>
                {selectedLead.current.isTeamLead && isManager && managerModeEnabled && (
                  <View className="bg-purple-500 rounded-full px-2 py-0.5 mr-2">
                    <Text className="text-white text-xs font-semibold">Team Lead</Text>
                  </View>
                )}
                <TouchableOpacity onPress={openMaps} className="ml-2 p-1">
                  <Image
                    source={require('../../assets/images/navigation-icon.png')}
                    className="w-5 h-5 tint-blue-500"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {recentNote && (
          <View
            className="bg-white rounded p-2.5 mb-2.5 shadow"
            style={{
              position: 'absolute',
              left: menuPosition.x + width / 2 - 150,
              top: menuPosition.y + height / 2 - 60,
            }}
          >
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-800">Recent Note: {recentNote.note}</Text>
              <TouchableOpacity onPress={() => showFullNotesModal(selectedLead.current.id)}>
                <Text className="text-blue-500 ml-1 text-lg font-bold">→</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View
          className="bg-white rounded flex-row justify-around p-1.5 shadow w-75"
          style={{
            position: 'absolute',
            left: menuPosition.x + width / 2 - 150,
            top: menuPosition.y + height / 2,
          }}
        >
          {statuses.map((status, index) => (
            <TouchableOpacity
              key={index}
              className="p-2.5 items-center"
              onPress={() => {
                updateLeadStatus(selectedLead.current.id, index);
                selectedLead.current = null;
                setMenuPosition({ x: 0, y: 0 });
              }}
              disabled={selectedLead.current.isTeamLead && isManager && managerModeEnabled}
            >
              <View 
                style={{ 
                  backgroundColor: colors[index],
                  opacity: selectedLead.current.isTeamLead && isManager && managerModeEnabled ? 0.5 : 1
                }} 
                className="h-0.5 w-full mb-0.5" 
              />
              <Text 
                className={`text-xs text-center mt-0.5 ${selectedLead.current.isTeamLead && isManager && managerModeEnabled ? 'text-gray-400' : 'text-black'}`}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className={`${selectedLead.current.isTeamLead && isManager && managerModeEnabled ? 'bg-gray-400' : 'bg-blue-500'} rounded-full py-2 px-3 shadow mt-0 absolute right-0 top-16`}
            onPress={() => setIsNoteModalVisible(true)}
            disabled={selectedLead.current.isTeamLead && isManager && managerModeEnabled}
          >
            <Text className="text-white text-sm font-bold">+Note</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderNoteModal() {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isNoteModalVisible}
        onRequestClose={() => setIsNoteModalVisible(false)}
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
                onPress={() => setIsNoteModalVisible(false)}
              >
                <Text className="text-white font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-600 py-3 px-6 rounded-lg items-center flex-1 ml-2"
                onPress={addNote}
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
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isFullNotesModalVisible}
        onRequestClose={() => setIsFullNotesModalVisible(false)}
      >
        <View className="flex-1 bg-white p-5 justify-start">
          <Text className="text-2xl font-bold mb-5 text-center text-gray-800">All Notes</Text>
          <ScrollView className="flex-1">
            {allNotes.map((note, index) => (
              <View key={index} className="p-3.5 border-b border-gray-300">
                <Text className="text-base text-gray-800">{note.note}</Text>
                <Text className="text-xs text-gray-500 mt-1.25">
                  {new Date(note.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            className="bg-blue-500 py-3.5 rounded mt-5 items-center"
            onPress={() => setIsFullNotesModalVisible(false)}
          >
            <Text className="text-white text-lg font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  async function createNewLead(coordinate) {
    try {
      setIsValidatingAddress(true);
      // Get current user info
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        Alert.alert('Error', 'Authentication error');
        return;
      }

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

      // Get address from coordinates using reverse geocoding
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        console.error('No address found for coordinates');
        return;
      }

      const addressComponents = data.results[0].address_components;
      const formattedAddress = data.results[0].formatted_address;

      // Extract address components
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
          address: `${streetNumber} ${route}`.trim(),
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
          dob: '',
          territory: null
        }])
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        return;
      }

      // Set the address for validation
      setNewLeadAddress(formattedAddress);
      setEditableAddress(formattedAddress);
      setNewLeadId(newLead.id);
      setShowAddressValidation(true);
      setIsValidatingAddress(false);
    } catch (error) {
      console.error('Error in createNewLead:', error);
      setIsValidatingAddress(false);
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
          return;
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
          return;
        }
      }

      // Clear all state and close modal
      setShowNewLeadButton(false);
      setShowAddressValidation(false);
      setNewLeadAddress('');
      setEditableAddress('');
      setNewLeadId(null);
      setNewLeadCoordinate(null);
      setValidationPosition({ x: 0, y: 0 });
      
      // Refresh leads list after everything is done
      await fetchLeads();
    } catch (error) {
      console.error('Error in confirmLeadAddress:', error);
      // Still clear state even if there's an error
      setShowNewLeadButton(false);
      setShowAddressValidation(false);
      setNewLeadAddress('');
      setEditableAddress('');
      setNewLeadId(null);
      setNewLeadCoordinate(null);
      setValidationPosition({ x: 0, y: 0 });
    }
  }

  async function cancelLeadCreation() {
    try {
      // Delete the lead if it exists
      if (newLeadId) {
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .eq('id', newLeadId);

        if (deleteError) {
          console.error('Error deleting lead:', deleteError);
        }
      }

      setShowNewLeadButton(false);
      setShowAddressValidation(false);
      setNewLeadAddress('');
      setNewLeadId(null);
    } catch (error) {
      console.error('Error in cancelLeadCreation:', error);
    }
  }

  const memoizedMap = useMemo(
    () => (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        className="flex-1"
        onPress={(e) => {
          if (isDrawingMode) {
            handleMapPress(e);
          } else if (isDrawing) {
            const newPoint = e.nativeEvent.coordinate;
            setPolygonPoints([...polygonPoints, newPoint]);
          } else {
            selectedLead.current = null;
            setDummyRender((prev) => !prev);
            setShowNewLeadButton(false);
          }
        }}
        onLongPress={(e) => {
          if (!isDrawing && !isDrawingMode) {
            const { coordinate } = e.nativeEvent;
            setNewLeadCoordinate(coordinate);
            mapRef.current.pointForCoordinate(coordinate).then((point) => {
              setNewLeadButtonPosition(point);
              setShowNewLeadButton(true);
            });
          }
        }}
        moveOnMarkerPress={false}
        showsUserLocation={locationPermission}
        scrollEnabled={!isDrawing && !isDrawingMode}
        mapType={isSatellite ? 'satellite' : 'standard'}
        showsMyLocationButton={false}
        onMapReady={() => setIsMapReady(true)}
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
        
        {isClustering
          ? clusteredPoints.map((point) => {
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
                      <Text className="text-white font-bold">{point_count}</Text>
                    </View>
                  </Marker>
                );
              }

              const lead = point.properties;

              return (
                <Marker
                  key={`${lead.id}-${lead.status}`} // Include status in the key
                  coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
                  pinColor={getPinColor(lead.status, lead.isTeamLead)}
                  onPress={(event) => showMenu(lead, event)}
                  onLongPress={() => showBigMenu(lead)}
                  onDragStart={() => handleDragStart(lead)}
                  onDragEnd={(e) => handleDragEnd(lead, e)}
                  draggable={true}
                />
              );
            })
          : visibleLeads.map((lead) => (
              <Marker
                key={`${lead.id}-${lead.status}`}
                coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
                pinColor={getPinColor(lead.status, lead.isTeamLead)}
                onPress={(event) => showMenu(lead, event)}
                onLongPress={() => showBigMenu(lead)}
                onDragStart={() => handleDragStart(lead)}
                onDragEnd={(e) => handleDragEnd(lead, e)}
                draggable={true}
              />
            ))}
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
      clusteredPoints,
      polygonPoints,
      locationPermission,
      isClustering,
      visibleLeads,
      isSatellite,
      teamTerritories,
      isManager,
      managerModeEnabled,
      isDrawingMode,
      polygonCoordinates,
      territoryColor
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
              fetchLeads();
            } catch (error) {
              console.error('Error in deleteLead:', error);
              Alert.alert('Error', 'An unexpected error occurred while deleting the lead');
            }
          }
        }
      ]
    );
  }

  return (
    <View className="flex-1 w-full h-full">
      {memoizedMap}
      {renderStatusMenu()}
      {renderNoteModal()}
      {renderFullNotesModal()}
      {/* Remove the first Create New Lead button */}

      {/* Hamburger Menu */}
      <View className="absolute top-10 left-4 z-10">
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
        <View className="absolute top-10 left-16 z-10 bg-purple-600 px-3 py-1 rounded-full">
          <Text className="text-white font-semibold text-xs">Manager Mode</Text>
        </View>
      )}
      
      {/* Territory Management Button (Only visible in manager mode) */}
      {isManager && managerModeEnabled && (
        <TouchableOpacity 
          className="absolute top-20 left-5 z-10 bg-gray-800 p-2 rounded-full shadow-md"
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
        <View className="absolute top-16 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-20">
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

      <View className="flex-1 bg-gray-900 px-6 py-8">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-semibold text-white">Settings</Text>
          <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)}>
            <Text className="text-xl font-semibold text-white">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Content */}
        <View className="space-y-6">
          {/* Satellite View Toggle */}
          <View className="flex-row items-center justify-between p-3 bg-gray-800 rounded-lg">
            <Text className="text-md text-gray-200">Satellite View</Text>
            <Switch
              value={isSatellite}
              onValueChange={(value) => setIsSatellite(value)}
              thumbColor={isSatellite ? '#4ADE80' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
            />
          </View>

          {/* Manager Mode Toggle - Only visible for managers */}
          {isManager && (
            <View className="flex-row items-center justify-between p-3 bg-gray-800 rounded-lg">
              <View>
                <Text className="text-md text-gray-200">Manager Mode</Text>
                <Text className="text-xs text-gray-400 mt-1">Enable special manager features</Text>
              </View>
              <Switch
                value={managerModeEnabled}
                onValueChange={(value) => setManagerModeEnabled(value)}
                thumbColor={managerModeEnabled ? '#4ADE80' : '#f4f3f4'}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
              />
            </View>
          )}

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

    {/* Crosshair */}
    {!startSaleModal && (
      <View className="absolute top-10 right-4 items-center">
        <TouchableOpacity
          className="bg-transparent p-0.5 rounded-full border border-black opacity-25"
          onPress={centerMapOnUserLocation}
        >
          <Image source={require('../../assets/images/crosshair.png')} className="w-7 h-7" />
        </TouchableOpacity>
      </View>
    )}
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

    {/* Address Validation Modal */}
    {showAddressValidation && (
      <View className="absolute inset-0 bg-black bg-opacity-50 z-50">
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white rounded-lg p-4 m-4">
            <Text className="text-xl font-bold mb-4">Confirm Intended Address</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 text-lg"
              value={editableAddress}
              onChangeText={setEditableAddress}
              multiline
              numberOfLines={3}
              placeholder="Enter or edit the address"
            />
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                className="bg-gray-500 px-4 py-2 rounded-lg"
                onPress={cancelLeadCreation}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 px-4 py-2 rounded-lg"
                onPress={confirmLeadAddress}
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    )}

    {/* Loading Overlay */}
    {isValidatingAddress && (
      <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center z-50">
        <View className="bg-white rounded-lg p-4 m-4 w-[90%] max-w-md">
          <Text className="text-lg font-semibold mb-2">Creating Lead...</Text>
          <Text className="text-gray-600">Please wait while we process your request.</Text>
        </View>
      </View>
    )}

    {/* Create New Lead Button */}
    {showNewLeadButton && !showAddressValidation && newLeadButtonPosition && (
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
        <Text className="text-white font-semibold">Create New Lead</Text>
      </TouchableOpacity>
    )}

  </View>
);
}