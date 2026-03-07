// src/firebase/communityServices.js
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, deleteDoc } from 'firebase/firestore'; // <-- Added doc, deleteDoc
import { db } from './config';

// ==========================================
// 1. QUICK GIGS & PASABUY ERRANDS
// ==========================================

export const addQuickGig = async (gigData) => {
  try {
    const docRef = await addDoc(collection(db, 'quick_gigs'), {
      ...gigData,
      status: 'open',
      acceptedById: null,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding gig: ", error);
    return { success: false, error: error.message };
  }
};

export const getOpenGigs = async (type = 'gig') => {
  try {
    // type can be 'gig' or 'pasabuy'
    const q = query(
      collection(db, 'quick_gigs'), 
      where("status", "==", "open"),
      where("type", "==", type),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching gigs: ", error);
    return [];
  }
};

// ==========================================
// 2. LOCAL SERVICES (Barangay Yellow Pages / LiveliMarket)
// ==========================================

export const addLocalService = async (serviceData) => {
  try {
    const docRef = await addDoc(collection(db, 'local_services'), {
      ...serviceData,
      isAvailable: true,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding service: ", error);
    return { success: false, error: error.message };
  }
};

export const getAllLocalServices = async () => {
  try {
    const q = query(collection(db, 'local_services'), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching services: ", error);
    return [];
  }
};

// --> NEW DELETE FUNCTION ADDED HERE <--
export const deleteLocalService = async (itemId) => {
  try {
    const itemRef = doc(db, 'local_services', itemId);
    await deleteDoc(itemRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting service: ", error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// 3. LIVELIHOOD PROGRAMS (Admin Seminars)
// ==========================================

export const addLivelihoodProgram = async (programData) => {
  try {
    const docRef = await addDoc(collection(db, 'livelihood_programs'), {
      ...programData,
      enrolledUsers: [],
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding program: ", error);
    return { success: false, error: error.message };
  }
};

export const getLivelihoodPrograms = async () => {
  try {
    const q = query(collection(db, 'livelihood_programs'), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching programs: ", error);
    return [];
  }
};