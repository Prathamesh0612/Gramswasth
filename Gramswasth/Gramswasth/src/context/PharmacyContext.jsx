import { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { pharmacyAPI } from '../services/api';

const PharmacyContext = createContext(null);

export function PharmacyProvider({ children }) {
  const [activePharmacy, setActivePharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastTransaction, setLastTransaction] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      // Try to fetch profile and inventory
      const [profRes, invRes] = await Promise.all([
        pharmacyAPI.getProfile(),
        pharmacyAPI.getInventory()
      ]);
      
      const pharmacyData = {
        ...(profRes.success && profRes.data ? profRes.data : { id: 'phar_001', name: 'My Pharmacy' }),
        medicines: invRes.success && invRes.data ? invRes.data : []
      };
      
      setActivePharmacy(pharmacyData);
    } catch (err) {
      console.error('Failed to load pharmacy data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (role === 'pharmacy' && token) {
      fetchInventory();
    } else {
      setLoading(false);
    }
  }, []);

  const updateInventory = async (newInventory) => {
    setActivePharmacy(prev => ({...prev, medicines: newInventory}));
    try {
      await pharmacyAPI.updateInventory(newInventory);
    } catch (e) {
      console.error(e);
    }
  };

  const sellMedicine = async (barcode) => {
    if (!activePharmacy) return { success: false, message: 'Not initialized' };
    const inventory = [...(activePharmacy.medicines || [])];
    const itemIndex = inventory.findIndex(m => m.barcode === barcode);

    if (itemIndex === -1) return { success: false, message: 'Product not found' };
    if (inventory[itemIndex].qty <= 0) return { success: false, message: 'Out of stock' };

    inventory[itemIndex] = { ...inventory[itemIndex], qty: inventory[itemIndex].qty - 1 };
    await updateInventory(inventory);
    
    setLastTransaction({ barcode, medicineKey: inventory[itemIndex].key, timestamp: Date.now() });
    return { success: true, productName: inventory[itemIndex].key, newQty: inventory[itemIndex].qty };
  };

  const cancelLastTransaction = async () => {
    if (!lastTransaction || !activePharmacy) return { success: false, message: 'No transaction' };
    const inventory = [...(activePharmacy.medicines || [])];
    const itemIndex = inventory.findIndex(m => m.barcode === lastTransaction.barcode);
    if (itemIndex === -1) return { success: false };

    inventory[itemIndex] = { ...inventory[itemIndex], qty: inventory[itemIndex].qty + 1 };
    await updateInventory(inventory);
    setLastTransaction(null);
    return { success: true, productName: inventory[itemIndex].key };
  };

  const deleteMedicine = async (barcode) => {
    if (!activePharmacy) return { success: false };
    const inventory = activePharmacy.medicines.filter(m => m.barcode !== barcode);
    await updateInventory(inventory);
    return { success: true };
  };

  return (
    <PharmacyContext.Provider value={{
      activePharmacy,
      pharmacies: activePharmacy ? [activePharmacy] : [],
      loading,
      lastTransaction,
      setActivePharmacyId: () => {},
      updateInventory, sellMedicine, cancelLastTransaction, deleteMedicine
    }}>
      {children || <Outlet />}
    </PharmacyContext.Provider>
  );
}

export function usePharmacy() {
  const ctx = useContext(PharmacyContext);
  if (!ctx) throw new Error('usePharmacy must be used within a PharmacyProvider');
  return ctx;
}
