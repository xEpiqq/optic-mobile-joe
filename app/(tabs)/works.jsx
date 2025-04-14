// // Import statements
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Dimensions,
//   TextInput,
//   Modal,
//   ScrollView,
//   Image,
//   Switch,
//   Linking,
//   Platform,
//   ActivityIndicator,
// } from 'react-native';
// import MapView, { PROVIDER_GOOGLE, Marker, Polygon } from 'react-native-maps';
// import { useClusterer } from 'react-native-clusterer';
// import * as Location from 'expo-location';
// import { WebView } from 'react-native-webview';
// import { useSupabase } from '../../contexts/SupabaseContext';
// import 'react-native-url-polyfill/auto';

// const { width, height } = Dimensions.get('window');
// const MAP_DIMENSIONS = { width, height };
// const BUFFER_FACTOR = 2;

// export default function Tab() {
//   const { supabase } = useSupabase();
//   const [bigMenu, setBigMenu] = useState(false);
//   const [leads, setLeads] = useState([]);
//   const [initialRegion, setInitialRegion] = useState({
//     latitude: 40.5853,
//     longitude: -105.0844,
//     latitudeDelta: 1,
//     longitudeDelta: 1,
//   });
//   const mapRef = useRef(null);
//   const [locationPermission, setLocationPermission] = useState(null);
//   const [polygonPoints, setPolygonPoints] = useState([]);
//   const [userLocation, setUserLocation] = useState(null);
//   const [optimisticLocation, setOptimisticLocation] = useState(null);
//   const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
//   const [saveMessage, setSaveMessage] = useState('');
//   const [region, setRegion] = useState(initialRegion);
//   const [isClustering, setIsClustering] = useState(true);
//   const [isSatellite, setIsSatellite] = useState(false);
//   const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
//   const [noteText, setNoteText] = useState('');
//   const [recentNote, setRecentNote] = useState(null);
//   const [leadAddress, setLeadAddress] = useState(null);
//   const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
//   const [isFullNotesModalVisible, setIsFullNotesModalVisible] = useState(false);
//   const [allNotes, setAllNotes] = useState([]);
//   const [startSaleModal, setStartSaleModal] = useState(false);
//   const selectedLead = useRef(null);
//   const selectedPlan = useRef(null);
//   const showCredentialsRef = useRef(false);
//   const uasapRef = useRef('');
//   const pasapRef = useRef('');
//   const firstName = useRef('');
//   const lastName = useRef('');
//   const phone = useRef('');
//   const email = useRef('');
//   const dob = useRef('');
//   const asapZip = useRef('');
//   const asapAddress = useRef('');
//   const asapCity = useRef('');
//   const asapUasap = useRef('');
//   const asapPasap = useRef('');
//   const recentLead = useRef('');
//   const noteInputRef = useRef(null);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [loading, setLoading] = useState(true); // Added loading state
//   const [errorMessage, setErrorMessage] = useState(''); // Error message state

//   useEffect(() => {
//     (async () => {
//       await fetchLeads();
//       await requestLocationPermissionAndFetch();
//       setLoading(false);
//     })();

//     return () => {
//       saveMapState(region);
//     };
//   }, []);

//   useEffect(() => {
//     if (isNoteModalVisible && noteInputRef.current) {
//       noteInputRef.current.focus();
//     }
//   }, [isNoteModalVisible]);

//   async function fetchLeads() {
//     try {
//       const { data: userData, error: userError } = await supabase.auth.getUser();
//       if (userError) throw userError;
//       if (!userData?.user) return;

//       const { data, error } = await supabase
//         .from('restaurants')
//         .select('id, location, status, knocks')
//         .eq('user_id', userData.user.id);

//       if (error) throw error;

//       const formattedLeads = data.map((lead) => ({
//         ...lead,
//         latitude: lead.location.coordinates[1],
//         longitude: lead.location.coordinates[0],
//       }));
//       setLeads(formattedLeads);
//     } catch (error) {
//       console.error('Error fetching leads:', error);
//       setErrorMessage('Failed to fetch leads. Please try again.');
//     }
//   }

//   async function requestLocationPermissionAndFetch() {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       setLocationPermission(status === 'granted');
//       if (status !== 'granted') {
//         console.error('Location permission not granted');
//         return;
//       }

//       const lastKnownLocation = await Location.getLastKnownPositionAsync({});
//       if (lastKnownLocation) {
//         setOptimisticLocation({
//           latitude: lastKnownLocation.coords.latitude,
//           longitude: lastKnownLocation.coords.longitude,
//         });
//       }

//       const location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.Highest,
//       });
//       setUserLocation({
//         latitude: location.coords.latitude,
//         longitude: location.coords.longitude,
//       });
//     } catch (error) {
//       console.error('Error fetching user location:', error);
//       setErrorMessage('Failed to get user location. Please try again.');
//     }
//   }

//   function toggleCredentialsInputs() {
//     showCredentialsRef.current = !showCredentialsRef.current;
//     // Force re-render
//     setIsSettingsModalVisible((prev) => !prev);
//     setIsSettingsModalVisible((prev) => !prev);
//   }

//   async function saveCredentialsToDatabase() {
//     try {
//       const { data: userData, error: userError } = await supabase.auth.getUser();
//       if (userError) throw userError;
//       if (!userData?.user) return;

//       const { error } = await supabase
//         .from('profiles')
//         .update({ uasap: uasapRef.current, pasap: pasapRef.current })
//         .eq('user_id', userData.user.id);

//       if (error) throw error;

//       setSaveMessage('Credentials saved successfully!');
//       setTimeout(() => setSaveMessage(''), 3000);
//     } catch (error) {
//       console.error('Error saving credentials:', error);
//       setErrorMessage('Failed to save credentials. Please try again.');
//     }
//   }

//   async function handleLogout() {
//     setIsSettingsModalVisible(false);
//     setTimeout(async () => {
//       try {
//         const { error } = await supabase.auth.signOut();
//         if (error) throw error;

//         // Navigate to login or appropriate screen
//         // navigation.replace('/(auth)/SelectOrganization');
//       } catch (error) {
//         console.error('Logout failed:', error);
//         setErrorMessage('Failed to logout. Please try again.');
//       }
//     }, 300);
//   }

//   async function saveMapState(regionToSave) {
//     // Implement map state saving logic if needed
//   }

//   function onRegionChangeComplete(newRegion) {
//     setRegion(newRegion);
//     saveMapState(newRegion);

//     setIsClustering(newRegion.latitudeDelta >= 0.1);
//   }

//   function getPinColor(status) {
//     switch (status) {
//       case 0:
//         return '#6A0DAD'; // New
//       case 1:
//         return '#FFD700'; // Gone
//       case 2:
//         return '#1E90FF'; // Later
//       case 3:
//         return '#FF6347'; // Nope
//       case 4:
//         return '#32CD32'; // Sold
//       case 5:
//         return '#00008B'; // Return
//       default:
//         return '#6A0DAD'; // Default color
//     }
//   }

//   async function updateLeadStatus(leadId, newStatus) {
//     try {
//       setLeads((prevLeads) =>
//         prevLeads.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
//       );

//       const { error } = await supabase
//         .from('restaurants')
//         .update({ status: newStatus })
//         .eq('id', leadId);

//       if (error) throw error;
//     } catch (error) {
//       console.error('Error updating lead status:', error);
//       setErrorMessage('Failed to update lead status. Please try again.');
//       fetchLeads(); // Refresh leads in case of error
//     }
//   }

//   async function fetchMostRecentNote(restaurantId) {
//     try {
//       const { data, error } = await supabase
//         .from('notes')
//         .select('note, created_at')
//         .eq('restaurant_id', restaurantId)
//         .order('created_at', { ascending: false })
//         .limit(1);

//       if (error) throw error;

//       if (!data.length) {
//         setRecentNote(null);
//       } else {
//         setRecentNote(data[0]);
//       }
//     } catch (error) {
//       console.error('Error fetching recent note:', error);
//       setErrorMessage('Failed to fetch recent note. Please try again.');
//     }
//   }

//   async function fetchLeadAddress(restaurantId) {
//     try {
//       const { data, error } = await supabase
//         .from('restaurants')
//         .select('address, address2')
//         .eq('id', restaurantId)
//         .single();

//       if (error) throw error;

//       const fullAddress = `${data.address} ${data.address2 || ''}`;
//       setLeadAddress(fullAddress.trim());
//     } catch (error) {
//       console.error('Error fetching address:', error);
//       setErrorMessage('Failed to fetch lead address. Please try again.');
//     }
//   }

//   function openMaps() {
//     if (!selectedLead.current) return console.error('No lead selected.');

//     const { latitude, longitude } = selectedLead.current;
//     const url = Platform.select({
//       ios: `http://maps.apple.com/?ll=${latitude},${longitude}`,
//       android: `http://maps.google.com/?q=${latitude},${longitude}`,
//     });

//     Linking.openURL(url).catch((err) => console.error('Failed to open map:', err));
//   }

//   function showMenu(lead, event) {
//     if (recentNote !== '') setRecentNote('');
//     recentLead.current = lead;

//     const { coordinate } = event.nativeEvent;
//     mapRef.current.pointForCoordinate(coordinate).then((point) => {
//       const x = point.x - width / 2;
//       const y = point.y - height / 2;
//       selectedLead.current = lead;
//       fetchMostRecentNote(lead.id);
//       fetchLeadAddress(lead.id);
//       setMenuPosition({ x, y: y - 100 });
//     });
//   }

//   function showBigMenu(lead) {
//     selectedLead.current = lead;
//     setBigMenu(true);
//     handleDragStart(lead);
//   }

//   function closeBigMenu() {
//     setBigMenu(false);
//     selectedLead.current = null;
//     firstName.current = '';
//     lastName.current = '';
//     phone.current = '';
//     email.current = '';
//     dob.current = '';
//     // Force re-render
//     setBigMenu((prev) => !prev);
//     setBigMenu((prev) => !prev);
//   }

//   async function handleDragStart(lead) {
//     recentLead.current = lead;
//     setBigMenu(true);

//     try {
//       const { data, error } = await supabase
//         .from('restaurants')
//         .select('first_name, last_name, email, phone, dob')
//         .eq('id', lead.id)
//         .single();

//       if (error) throw error;

//       if (data) {
//         firstName.current = data.first_name || '';
//         lastName.current = data.last_name || '';
//         phone.current = data.phone || '';
//         email.current = data.email || '';
//         dob.current = data.dob || '';
//       }

//       // Force re-render
//       setBigMenu((prev) => !prev);
//       setBigMenu((prev) => !prev);
//     } catch (error) {
//       console.error('Error querying Supabase:', error);
//       setErrorMessage('Failed to fetch lead details. Please try again.');
//     }
//   }

//   function handleDragEnd(lead, event) {
//     // Handle drag end if needed
//   }

//   async function addNote() {
//     const trimmedNote = noteText.trim();
//     if (trimmedNote === '') return;

//     setRecentNote({ note: trimmedNote, created_at: new Date().toISOString() });
//     setNoteText('');
//     setIsNoteModalVisible(false);

//     try {
//       const { data: userData, error: userError } = await supabase.auth.getUser();
//       if (userError) throw userError;
//       if (!userData?.user) return;

//       const { error } = await supabase.from('notes').insert({
//         restaurant_id: recentLead.current.id,
//         note: trimmedNote,
//         created_by: userData.user.id,
//       });

//       if (error) throw error;

//       // Force re-render
//       setIsNoteModalVisible((prev) => !prev);
//       setIsNoteModalVisible((prev) => !prev);
//     } catch (error) {
//       console.error('Error adding note:', error);
//       setErrorMessage('Failed to add note. Please try again.');
//       setRecentNote(null);
//     }
//   }

//   function formatDob(dob) {
//     if (dob && dob.length === 8 && !dob.includes('/')) {
//       return `${dob.slice(0, 2)}/${dob.slice(2, 4)}/${dob.slice(4, 8)}`;
//     }
//     return dob;
//   }

//   async function startSale() {
//     setStartSaleModal(true);
//     setBigMenu(false);

//     if (!recentLead.current?.id) return console.error('No recent lead found.');

//     try {
//       const { data, error } = await supabase
//         .from('restaurants')
//         .select('address, zip5, city')
//         .eq('id', recentLead.current.id)
//         .single();

//       if (error) throw error;

//       const { data: userData, error: userError } = await supabase.auth.getUser();
//       if (userError) throw userError;

//       const { data: asaplogin, error: asapError } = await supabase
//         .from('profiles')
//         .select('uasap, pasap')
//         .eq('user_id', userData.user.id)
//         .single();

//       if (asapError) throw asapError;

//       asapPasap.current = asaplogin.pasap;
//       asapUasap.current = asaplogin.uasap;
//       asapAddress.current = data.address;
//       asapZip.current = data.zip5;
//       asapCity.current = data.city;

//       const { error: insertError } = await supabase
//         .from('restaurants')
//         .update({
//           first_name: firstName.current.trim(),
//           last_name: lastName.current.trim(),
//           email: email.current.trim(),
//           phone: phone.current.trim(),
//           dob: dob.current.trim(),
//         })
//         .eq('id', recentLead.current.id);

//       if (insertError) throw insertError;
//     } catch (error) {
//       console.error('Error starting sale:', error);
//       setErrorMessage('Failed to start sale. Please try again.');
//     }
//   }

//   function centerMapOnUserLocation() {
//     const locationToUse = userLocation || optimisticLocation;

//     if (mapRef.current && locationToUse && initialRegion) {
//       mapRef.current.animateToRegion({
//         latitude: locationToUse.latitude,
//         longitude: locationToUse.longitude,
//         latitudeDelta: initialRegion.latitudeDelta,
//         longitudeDelta: initialRegion.longitudeDelta,
//       });
//     } else {
//       console.error('User location not available');
//     }
//   }

//   function getVisibleLeads() {
//     if (!region) return [];
//     const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

//     const bufferedLatDelta = latitudeDelta * BUFFER_FACTOR;
//     const bufferedLngDelta = longitudeDelta * BUFFER_FACTOR;

//     const minLat = latitude - bufferedLatDelta / 2;
//     const maxLat = latitude + bufferedLatDelta / 2;
//     const minLng = longitude - bufferedLngDelta / 2;
//     const maxLng = longitude + bufferedLngDelta / 2;

//     return leads.filter(
//       (lead) =>
//         lead.latitude >= minLat &&
//         lead.latitude <= maxLat &&
//         lead.longitude >= minLng &&
//         lead.longitude <= maxLng
//     );
//   }

//   const visibleLeads = getVisibleLeads();

//   const geoJSONLeads = visibleLeads.map((lead) => ({
//     type: 'Feature',
//     geometry: {
//       type: 'Point',
//       coordinates: [lead.longitude, lead.latitude],
//     },
//     properties: {
//       id: lead.id,
//       status: lead.status,
//       knocks: lead.knocks || 0,
//       latitude: lead.latitude,
//       longitude: lead.longitude,
//     },
//   }));

//   const [clusteredPoints, supercluster] = useClusterer(
//     isClustering ? geoJSONLeads : [],
//     MAP_DIMENSIONS,
//     region,
//     {
//       minZoom: 0,
//       maxZoom: 12,
//       minPoints: 2,
//       radius: 40,
//     }
//   );

//   function renderStatusMenu() {
//     if (!selectedLead.current) return null;

//     const statuses = ['New', 'Gone', 'Later', 'Nope', 'Sold', 'Return'];
//     const colors = ['#6A0DAD', '#FFD700', '#1E90FF', '#FF6347', '#32CD32', '#00008B'];

//     return (
//       <View
//         style={{
//           position: 'absolute',
//           left: menuPosition.x + width / 2 - 150,
//           top: menuPosition.y + height / 2,
//           backgroundColor: 'white',
//           borderRadius: 5,
//           padding: 6,
//           shadowColor: '#000',
//           shadowOpacity: 0.1,
//           shadowRadius: 5,
//           shadowOffset: { width: 0, height: 2 },
//           width: 300,
//         }}
//       >
//         {recentNote && (
//           <View style={{ marginBottom: 10 }}>
//             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//               <Text style={{ fontSize: 12, color: '#333' }}>Recent Note: {recentNote.note}</Text>
//               <TouchableOpacity onPress={() => showFullNotesModal(selectedLead.current.id)}>
//                 <Text style={{ color: '#1E90FF', marginLeft: 4, fontSize: 18, fontWeight: 'bold' }}>→</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}
//         <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
//           {statuses.map((status, index) => (
//             <TouchableOpacity
//               key={index}
//               style={{ padding: 10, alignItems: 'center' }}
//               onPress={() => {
//                 updateLeadStatus(selectedLead.current.id, index);
//                 selectedLead.current = null;
//                 setMenuPosition({ x: 0, y: 0 });
//               }}
//             >
//               <View style={{ backgroundColor: colors[index], height: 2, width: '100%', marginBottom: 2 }} />
//               <Text style={{ fontSize: 12, textAlign: 'center', marginTop: 2 }}>{status}</Text>
//             </TouchableOpacity>
//           ))}
//           <TouchableOpacity
//             style={{
//               backgroundColor: '#1E90FF',
//               borderRadius: 9999,
//               paddingVertical: 8,
//               paddingHorizontal: 12,
//               shadowColor: '#000',
//               shadowOpacity: 0.2,
//               shadowRadius: 3,
//               shadowOffset: { width: 0, height: 1 },
//               marginTop: 0,
//               position: 'absolute',
//               right: 0,
//               top: -30,
//             }}
//             onPress={() => setIsNoteModalVisible(true)}
//           >
//             <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>+Note</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }

//   // Include renderNoteModal, renderFullNotesModal, and other rendering functions here
//   function renderNoteModal() {
//     // Implement your note modal here
//   }

//   function renderFullNotesModal() {
//     // Implement your full notes modal here
//   }

//   function renderSettingsModal() {
//     // Implement your settings modal here
//   }

//   function renderStartSaleModal() {
//     // Implement your start sale modal here
//   }

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" color="#1E90FF" />
//       </View>
//     );
//   }

//   return (
//     <View style={{ flex: 1, width: '100%', height: '100%' }}>
//       <MapView
//         ref={mapRef}
//         provider={PROVIDER_GOOGLE}
//         initialRegion={initialRegion}
//         onRegionChangeComplete={onRegionChangeComplete}
//         style={{ flex: 1 }}
//         onPress={(e) => {
//           if (isDrawing) {
//             const newPoint = e.nativeEvent.coordinate;
//             setPolygonPoints([...polygonPoints, newPoint]);
//           } else {
//             selectedLead.current = null;
//             // Force re-render
//             setMenuPosition({ x: 0, y: 0 });
//             setMenuPosition({ x: 0, y: 0 });
//           }
//         }}
//         moveOnMarkerPress={false}
//         showsUserLocation={locationPermission}
//         scrollEnabled={!isDrawing}
//         mapType={isSatellite ? 'satellite' : 'standard'}
//       >
//         {isClustering
//           ? clusteredPoints.map((point) => {
//               if (point.properties.cluster) {
//                 const { cluster_id, point_count } = point.properties;
//                 const coordinate = {
//                   latitude: point.geometry.coordinates[1],
//                   longitude: point.geometry.coordinates[0],
//                 };

//                 return (
//                   <Marker
//                     key={`cluster-${cluster_id}`}
//                     coordinate={coordinate}
//                     onPress={() => {
//                       const expansionZoom = supercluster.getClusterExpansionZoom(cluster_id);
//                       const newRegion = {
//                         latitude: coordinate.latitude,
//                         longitude: coordinate.longitude,
//                         latitudeDelta: Math.max(initialRegion.latitudeDelta / 2, 0.005),
//                         longitudeDelta: Math.max(initialRegion.longitudeDelta / 2, 0.005),
//                       };
//                       mapRef.current.animateToRegion(newRegion, 500);
//                     }}
//                   >
//                     <View
//                       style={{
//                         width: 40,
//                         height: 40,
//                         borderRadius: 20,
//                         backgroundColor: 'rgba(0,122,255,0.6)',
//                         justifyContent: 'center',
//                         alignItems: 'center',
//                       }}
//                     >
//                       <Text style={{ color: '#fff', fontWeight: 'bold' }}>{point_count}</Text>
//                     </View>
//                   </Marker>
//                 );
//               }

//               const lead = point.properties;

//               return (
//                 <Marker
//                   key={`${lead.id}-${lead.status}-${lead.knocks}`} // Include status and knocks in key
//                   coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
//                   pinColor={getPinColor(lead.status)}
//                   onPress={(event) => showMenu(lead, event)}
//                   onLongPress={() => showBigMenu(lead)}
//                   onDragStart={() => handleDragStart(lead)}
//                   onDragEnd={(e) => handleDragEnd(lead, e)}
//                   draggable={true}
//                 />
//               );
//             })
//           : visibleLeads.map((lead) => (
//               <Marker
//                 key={`${lead.id}-${lead.status}-${lead.knocks}`} // Include status and knocks in key
//                 coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
//                 pinColor={getPinColor(lead.status)}
//                 onPress={(event) => showMenu(lead, event)}
//                 onLongPress={() => showBigMenu(lead)}
//                 onDragStart={() => handleDragStart(lead)}
//                 onDragEnd={(e) => handleDragEnd(lead, e)}
//                 draggable={true}
//               />
//             ))}
//         {polygonPoints.length > 0 && (
//           <Polygon
//             coordinates={polygonPoints}
//             strokeColor="#000"
//             fillColor="rgba(0, 200, 0, 0.5)"
//             strokeWidth={2}
//           />
//         )}
//       </MapView>
//       {renderStatusMenu()}
//       {renderNoteModal()}
//       {renderFullNotesModal()}
//       {renderSettingsModal()}
//       {renderStartSaleModal()}
//       {/* Include other components and modals as in your original code */}
//       {/* Error Message */}
//       {errorMessage ? (
//         <View
//           style={{
//             position: 'absolute',
//             top: 50,
//             left: 0,
//             right: 0,
//             alignItems: 'center',
//             backgroundColor: 'rgba(255,0,0,0.7)',
//             padding: 10,
//           }}
//         >
//           <Text style={{ color: 'white', fontWeight: 'bold' }}>{errorMessage}</Text>
//         </View>
//       ) : null}
//     </View>
//   );
// }
