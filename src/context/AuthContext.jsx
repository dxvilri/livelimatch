import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          
          // 1. Try to find the user in the 'applicants' collection
          let docRef = doc(db, "applicants", currentUser.uid);
          let docSnap = await getDoc(docRef);

          // 2. If not found in applicants, check the 'employers' collection
          if (!docSnap.exists()) {
            docRef = doc(db, "employers", currentUser.uid);
            docSnap = await getDoc(docRef);
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // NORMALIZATION FOR DUAL ROLES (Solution 3)
            // If the DB has the new array format, use it. Otherwise, fallback to the old single string.
            const userRoles = data.roles || (data.role ? [data.role] : []);
            const currentWorkspace = data.activeWorkspace || data.role;

            setUserData({
              ...data,
              roles: userRoles,
              activeWorkspace: currentWorkspace
            });
          } else {
            // User exists in Auth but not in any Firestore collection
            setUserData(null); 
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);