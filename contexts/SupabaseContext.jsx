// // contexts/SupabaseContext.jsx

// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// // Define your organization configurations here
// const organizationConfigs = {
//   org1: {
//     supabaseUrl: 'https://skpyorxraswedkodjjxw.supabase.co',
//     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHlvcnhyYXN3ZWRrb2Rqanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMTQzODgsImV4cCI6MjA0NTc5MDM4OH0.ES-m1A3Z29PIEQqP7b_H2w5fjpQNByc7zjeU3H9VaRs',
//   },
//   org2: {
//     supabaseUrl: 'https://smoyvtkwjpeqavtrnzpe.supabase.co',
//     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MDc4MTAsImV4cCI6MjA0MjM4MzgxMH0.kxsFj7c5y2RAZuF4km4zgTXB1Dfjl_aTtTai4ypkFZU',
//   },
// //   org3: {
// //     supabaseUrl: 'https://smoyvtkwjpeqavtrnzpe.supabase.co',
// //     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MDc4MTAsImV4cCI6MjA0MjM4MzgxMH0.kxsFj7c5y2RAZuF4km4zgTXB1Dfjl_aTtTai4ypkFZU',
// //   },
// };

// const SupabaseContext = createContext();

// export function SupabaseProvider({ children }) {
//   const [organization, setOrganization] = useState(null);
//   const [supabaseClient, setSupabaseClient] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const selectOrganization = async (orgId) => {
//     if (organizationConfigs[orgId]) {
//       setOrganization(orgId);
//       try {
//         await AsyncStorage.setItem('@selected_org', orgId);
//       } catch (e) {
//         console.error('Failed to save organization.');
//       }
//     } else {
//       console.warn(`Organization ${orgId} is not configured.`);
//     }
//   };

//   useEffect(() => {
//     const loadOrganization = async () => {
//       try {
//         const orgId = await AsyncStorage.getItem('@selected_org');
//         if (orgId && organizationConfigs[orgId]) {
//           setOrganization(orgId);
//         }
//       } catch (e) {
//         console.error('Failed to load organization.');
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     loadOrganization();
//   }, []);

//   useEffect(() => {
//     if (organization && organizationConfigs[organization]) {
//       const { supabaseUrl, supabaseAnonKey } = organizationConfigs[organization];
//       const client = createClient(supabaseUrl, supabaseAnonKey, {
//         auth: {
//           storage: AsyncStorage,
//           autoRefreshToken: true,
//           persistSession: true,
//           detectSessionInUrl: false,
//         },
//       });
//       setSupabaseClient(client);
//     } else {
//       setSupabaseClient(null);
//     }
//   }, [organization]);

//   return (
//     <SupabaseContext.Provider value={{ supabase: supabaseClient, selectOrganization, organization, loading }}>
//       {children}
//     </SupabaseContext.Provider>
//   );
// }

// export function useSupabase() {
//   return useContext(SupabaseContext);
// }

















// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const organizationConfigs = {
//   org1: {
//     supabaseUrl: 'https://skpyorxraswedkodjjxw.supabase.co',
//     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHlvcnhyYXN3ZWRrb2Rqanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMTQzODgsImV4cCI6MjA0NTc5MDM4OH0.ES-m1A3Z29PIEQqP7b_H2w5fjpQNByc7zjeU3H9VaRs',
//   },
//   org2: {
//     supabaseUrl: 'https://smoyvtkwjpeqavtrnzpe.supabase.co',
//     supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MDc4MTAsImV4cCI6MjA0MjM4MzgxMH0.kxsFj7c5y2RAZuF4km4zgTXB1Dfjl_aTtTai4ypkFZU',
//   },
// };

// const SupabaseContext = createContext();

// export function SupabaseProvider({ children }) {
//   const [organization, setOrganization] = useState(null);
//   const [supabaseClient, setSupabaseClient] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const selectOrganization = async (orgId) => {
//     if (organizationConfigs[orgId]) {
//       setOrganization(orgId);
//       try {
//         await AsyncStorage.setItem('@selected_org', orgId);
//       } catch (e) {
//         console.error('Failed to save organization.');
//       }
//     } else {
//       console.warn(`Organization ${orgId} is not configured.`);
//     }
//   };

//   useEffect(() => {
//     const loadOrganization = async () => {
//       try {
//         const orgId = await AsyncStorage.getItem('@selected_org');
//         if (orgId && organizationConfigs[orgId]) {
//           setOrganization(orgId);
//         }
//       } catch (e) {
//         console.error('Failed to load organization.');
//       }
//     };
    
//     const loadSession = async () => {
//       try {
//         const sessionData = await AsyncStorage.getItem('@session');
//         if (sessionData) {
//           const parsedSession = JSON.parse(sessionData);
//           if (supabaseClient) {
//             supabaseClient.auth.setSession(parsedSession);
//           }
//         }
//       } catch (e) {
//         console.error('Failed to load session.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadOrganization().then(loadSession);
//   }, []);

//   useEffect(() => {
//     if (organization && organizationConfigs[organization]) {
//       const { supabaseUrl, supabaseAnonKey } = organizationConfigs[organization];
//       const client = createClient(supabaseUrl, supabaseAnonKey, {
//         auth: {
//           storage: AsyncStorage,
//           autoRefreshToken: true,
//           persistSession: true,
//           detectSessionInUrl: false,
//         },
//       });

//       client.auth.onAuthStateChange(async (event, session) => {
//         if (session) {
//           await AsyncStorage.setItem('@session', JSON.stringify(session));
//         } else {
//           await AsyncStorage.removeItem('@session');
//         }
//       });

//       setSupabaseClient(client);
//     } else {
//       setSupabaseClient(null);
//     }
//   }, [organization]);

//   return (
//     <SupabaseContext.Provider value={{ supabase: supabaseClient, selectOrganization, organization, loading }}>
//       {children}
//     </SupabaseContext.Provider>
//   );
// }

// export function useSupabase() {
//   return useContext(SupabaseContext);
// }


// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const organizationConfigs = {
//     org1: {
//       supabaseUrl: 'https://skpyorxraswedkodjjxw.supabase.co',
//       supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHlvcnhyYXN3ZWRrb2Rqanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMTQzODgsImV4cCI6MjA0NTc5MDM4OH0.ES-m1A3Z29PIEQqP7b_H2w5fjpQNByc7zjeU3H9VaRs',
//     },
//     org2: {
//       supabaseUrl: 'https://smoyvtkwjpeqavtrnzpe.supabase.co',
//       supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MDc4MTAsImV4cCI6MjA0MjM4MzgxMH0.kxsFj7c5y2RAZuF4km4zgTXB1Dfjl_aTtTai4ypkFZU',
//     },
//     org3: {
//         supabaseUrl: 'https://lrzqxcswrgbjlxmidoia.supabase.co',
//         supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyenF4Y3N3cmdiamx4bWlkb2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMjQyMTAsImV4cCI6MjA0NTkwMDIxMH0.YEQbCXgheRMWJlTYVp18-F5ucPj9FcLAhEO7jA45qj0',
//       },
//   };


// const SupabaseContext = createContext();

// export function SupabaseProvider({ children }) {
//   const [organization, setOrganization] = useState(null);
//   const [supabaseClient, setSupabaseClient] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const selectOrganization = async (orgId) => {
//     if (organizationConfigs[orgId]) {
//       setOrganization(orgId);
//       await AsyncStorage.setItem('@selected_org', orgId);
//     } else {
//       console.warn(`Organization ${orgId} is not configured.`);
//     }
//   };

//   useEffect(() => {
//     const initializeSupabase = async () => {
//       try {
//         const orgId = await AsyncStorage.getItem('@selected_org');
//         const sessionData = await AsyncStorage.getItem('@session');

//         if (orgId && organizationConfigs[orgId]) {
//           setOrganization(orgId);
//           const { supabaseUrl, supabaseAnonKey } = organizationConfigs[orgId];

//           // Create client with a storage option
//           const client = createClient(supabaseUrl, supabaseAnonKey, {
//             auth: {
//               storage: AsyncStorage,
//               autoRefreshToken: true,
//               persistSession: true,
//               detectSessionInUrl: false,
//             },
//           });

//           // If session exists, set it directly on the client
//           if (sessionData) {
//             const session = JSON.parse(sessionData);
//             await client.auth.setSession(session);
//           }

//           // Listen for auth state changes to store session updates
//           client.auth.onAuthStateChange(async (_, session) => {
//             if (session) {
//               await AsyncStorage.setItem('@session', JSON.stringify(session));
//             } else {
//               await AsyncStorage.removeItem('@session');
//             }
//           });

//           setSupabaseClient(client);
//         }
//       } catch (error) {
//         console.error("Failed to initialize Supabase:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     initializeSupabase();
//   }, []);

//   return (
//     <SupabaseContext.Provider value={{ supabase: supabaseClient, selectOrganization, organization, loading }}>
//       {children}
//     </SupabaseContext.Provider>
//   );
// }

// export function useSupabase() {
//   return useContext(SupabaseContext);
// }


import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const organizationConfigs = {
  org1: {
    supabaseUrl: 'https://skpyorxraswedkodjjxw.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHlvcnhyYXN3ZWRrb2Rqanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMTQzODgsImV4cCI6MjA0NTc5MDM4OH0.ES-m1A3Z29PIEQqP7b_H2w5fjpQNByc7zjeU3H9VaRs',
  },
  org2: {
    supabaseUrl: 'https://smoyvtkwjpeqavtrnzpe.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MDc4MTAsImV4cCI6MjA0MjM4MzgxMH0.kxsFj7c5y2RAZuF4km4zgTXB1Dfjl_aTtTai4ypkFZU',
  },
  org3: {
    supabaseUrl: 'https://lrzqxcswrgbjlxmidoia.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyenF4Y3N3cmdiamx4bWlkb2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMjQyMTAsImV4cCI6MjA0NTkwMDIxMH0.YEQbCXgheRMWJlTYVp18-F5ucPj9FcLAhEO7jA45qj0',
  },
  org4: {
    supabaseUrl: 'https://xsdvrcvagcewxvpewwjw.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZHZyY3ZhZ2Nld3h2cGV3d2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3NzE4MzcsImV4cCI6MjA1MzM0NzgzN30.btCWnPNwNXUJjG4pAM00-nsKABh3Bx4nUpBWaiRwcqk',
  },
  org5: {
    supabaseUrl: 'https://egwvyqqpdusiorqbmucy.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd3Z5cXFwZHVzaW9ycWJtdWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNzE5NDYsImV4cCI6MjA1MzY0Nzk0Nn0.hZ_sr-zREzhr4F_GzQYxLwonjGwgG2cGeTfNWghkDO0',
  }
};

const SupabaseContext = createContext();

export function SupabaseProvider({ children }) {
  const [organization, setOrganization] = useState(null);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const initializeSupabaseClient = async (orgId) => {
    const { supabaseUrl, supabaseAnonKey } = organizationConfigs[orgId];
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    const sessionData = await AsyncStorage.getItem('@session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      await client.auth.setSession(session);
    }

    client.auth.onAuthStateChange(async (_, session) => {
      if (session) {
        await AsyncStorage.setItem('@session', JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem('@session');
      }
    });

    setSupabaseClient(client);
    setLoading(false);
  };

  const selectOrganization = async (orgId) => {
    if (organizationConfigs[orgId]) {
      setOrganization(orgId);
      await AsyncStorage.setItem('@selected_org', orgId);
      await initializeSupabaseClient(orgId); // Reinitialize client on organization select
    } else {
      console.warn(`Organization ${orgId} is not configured.`);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      const orgId = await AsyncStorage.getItem('@selected_org');
      if (orgId && organizationConfigs[orgId]) {
        setOrganization(orgId);
        await initializeSupabaseClient(orgId); // Initialize client with selected org
      }
      setLoading(false);
    };

    initializeApp();
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase: supabaseClient, selectOrganization, organization, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
