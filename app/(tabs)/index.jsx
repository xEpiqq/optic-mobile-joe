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
  ActivityIndicator
} from 'react-native';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import MapView, { PROVIDER_GOOGLE, Marker, Polygon } from 'react-native-maps';
import { useClusterer } from 'react-native-clusterer';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useSupabase } from '../../contexts/SupabaseContext';
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


  useEffect(() => {
    if (isNoteModalVisible && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [isNoteModalVisible]);

  async function fetchLeads() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data, error } = await supabase
      .from('leads')
      .select('id, location, status, knocks')
      .eq('user_id', userData.user.id);

    if (error) return console.error('Error fetching leads:', error);

    const formattedLeads = data.map((lead) => ({
      ...lead,
      latitude: lead.location.coordinates[1],
      longitude: lead.location.coordinates[0],
    }));
    setLeads(formattedLeads); // Make sure setLeads triggers re-render
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

  function getPinColor(status) {
    const statusColors = {
      0: '#6A0DAD', // New
      1: '#FFD700', // Gone
      2: '#1E90FF', // Later
      3: '#FF6347', // Nope
      4: '#32CD32', // Sold
      5: '#00008B', // Return
    };
    return statusColors[status] || '#6A0DAD'; // Default color
  }

  async function updateLeadStatus(leadId, newStatus) {
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
            >
              <View style={{ backgroundColor: colors[index] }} className="h-0.5 w-full mb-0.5" />
              <Text className="text-xs text-center mt-0.5">{status}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className="bg-blue-500 rounded-full py-2 px-3 shadow mt-0 absolute right-0 top-16"
            onPress={() => setIsNoteModalVisible(true)}
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

  const memoizedMap = useMemo(
    () => (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        className="flex-1"
        onPress={(e) => {
          if (isDrawing) {
            const newPoint = e.nativeEvent.coordinate;
            setPolygonPoints([...polygonPoints, newPoint]);
          } else {
            selectedLead.current = null;
            setDummyRender((prev) => !prev);
          }
        }}
        moveOnMarkerPress={false}
        showsUserLocation={locationPermission}
        scrollEnabled={!isDrawing}
        mapType={isSatellite ? 'satellite' : 'standard'}
        showsMyLocationButton={false} // Add this line to hide the default location button on Android
        onMapReady={() => setIsMapReady(true)}
      >
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
                  pinColor={getPinColor(lead.status)}
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
                pinColor={getPinColor(lead.status)}
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
    ]
  );

  return (
    <View className="flex-1 w-full h-full">
      {memoizedMap}
      {renderStatusMenu()}
      {renderNoteModal()}
      {renderFullNotesModal()}
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

    {/* Big Menu */}
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


  </View>
);
}
