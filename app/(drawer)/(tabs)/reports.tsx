import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, FlatList 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_BASE = 'http://192.168.1.16:8000/api';

/**
 * ReportsScreen Component
 * Mobile report generator with status highlights:
 * - Red card background for properties with debt.
 * - Solid red box with white 'X' for overdue months.
 */
export default function ReportsScreen() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  const [fees, setFees] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [ingresoYear, setIngresoYear] = useState(currentYear);
  const [gastoMonth, setGastoMonth] = useState(currentMonthNum);
  const [gastoYear, setGastoYear] = useState(currentYear);

  const [activeModal, setActiveModal] = useState<'fees' | 'ingresoYear' | 'gastoMonth' | 'gastoYear' | null>(null);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthAbbr = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const availableYears = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    if (paymentType) fetchReport();
  }, [paymentType, ingresoYear]);

  const fetchFees = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/fees`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      setFees(res.data.data || []);
    } catch (e) { console.error("Error fetching fees:", e); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(
        `${API_BASE}/reports/debtors?payment_type=${encodeURIComponent(paymentType)}&year=${ingresoYear}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cleanData = Array.isArray(res.data.data) ? res.data.data : [];
      setData(cleanData);
    } catch (e) {
      Alert.alert("Error", "No se pudo obtener el reporte");
    } finally { setLoading(false); }
  };

  /**
   * Logic to determine the total overdue months (Historical + Selected Year).
   */
  const getOverdueTotal = (item: any) => {
    const historicalDebt = Number(item.months_overdue || 0);
    let currentYearDebt = 0;

    for (let m = 1; m < 13; m++) {
      const isPastMonth = (ingresoYear < currentYear) || (ingresoYear === currentYear && m < currentMonthNum);
      if (isPastMonth && !item[`month_${m}`]) {
        currentYearDebt++;
      }
    }
    return historicalDebt + currentYearDebt;
  };

  const renderSelector = (label: string, value: string | number, type: any) => (
    <View style={styles.selectorContainer}>
      <ThemedText style={styles.selectorLabel}>{label}</ThemedText>
      <TouchableOpacity style={styles.selectorBtn} onPress={() => setActiveModal(type)}>
        <ThemedText style={styles.selectorText}>{value}</ThemedText>
        <FontAwesome name="chevron-down" size={12} color="#888" />
      </TouchableOpacity>
    </View>
  );

  const renderDebtItem = (item: any, index: number) => {
    const overdueCount = getOverdueTotal(item);
    const hasDebt = overdueCount > 0;

    return (
      <View style={[styles.card, hasDebt && styles.cardOverdue]} key={item.id || index}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.addressText}>{index + 1}.- {item.full_address}</ThemedText>
            <ThemedText style={styles.ownerText}>Residente: {item.owner_name || 'N/A'}</ThemedText>
          </View>
          <View style={[styles.overdueBadge, hasDebt && styles.overdueBadgeActive]}>
            <ThemedText style={[styles.overdueText, hasDebt && {color: 'white'}]}>
              Atraso: {overdueCount}m
            </ThemedText>
          </View>
        </View>

        <View style={styles.monthGrid}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const isPaid = !!item[`month_${m}`];
            const isWaived = item[`month_${m}_status`] === 'Condonado';
            const isTrulyOverdue = (ingresoYear < currentYear) || (ingresoYear === currentYear && m < currentMonthNum);

            // Conditional Styles for the Month Box
            let boxStyle = styles.statusBox;
            let iconColor = "#dc3545"; // Default red
            let iconName = "times-circle";

            if (isPaid) {
              if (isWaived) {
                boxStyle = [styles.statusBox, styles.boxWaived];
                iconColor = "#17a2b8";
                iconName = "info-circle";
              } else {
                boxStyle = [styles.statusBox, styles.boxPaid];
                iconColor = "#28a745";
                iconName = "check-circle";
              }
            } else if (isTrulyOverdue) {
              // Solid red background for overdue months
              boxStyle = [styles.statusBox, styles.boxUnpaidSolid];
              iconColor = "white"; // White 'X'
              iconName = "times-circle";
            } else {
              boxStyle = [styles.statusBox, styles.boxFuture];
            }

            return (
              <View key={m} style={boxStyle}>
                <View style={styles.iconContainer}>
                  { (isPaid || isTrulyOverdue) ? (
                    <FontAwesome name={iconName} size={18} color={iconColor} />
                  ) : null }
                </View>
                <ThemedText style={[styles.monthAbbrText, isTrulyOverdue && !isPaid && {color: 'white'}]}>
                  {monthAbbr[m-1]}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.mainTitle}>Generador de Reportes</ThemedText>

        <View style={styles.filterSection}>
          {renderSelector("Tipo de Pago", paymentType || "Seleccionar", 'fees')}
          <View style={styles.row}>
            {renderSelector("Año Ingresos", ingresoYear, 'ingresoYear')}
            {renderSelector("Mes Gastos", monthNames[gastoMonth - 1], 'gastoMonth')}
          </View>
          <View style={styles.row}>
            {renderSelector("Año Gastos", gastoYear, 'gastoYear')}
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ padding: 15 }}>
            {data.length > 0 ? (
              data.map((item, index) => renderDebtItem(item, index))
            ) : (
              <ThemedText style={styles.noData}>Sin resultados</ThemedText>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!activeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setActiveModal(null)} activeOpacity={1}>
          <View style={styles.modalContent}>
            <FlatList
              data={
                activeModal === 'fees' ? [{name: 'Todos'}, ...fees] :
                activeModal === 'ingresoYear' || activeModal === 'gastoYear' ? availableYears.map(y => ({name: y})) :
                monthNames.map((m, i) => ({name: m, value: i + 1}))
              }
              keyExtractor={(item) => item.name.toString()}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => {
                  if (activeModal === 'fees') setPaymentType(item.name);
                  if (activeModal === 'ingresoYear') setIngresoYear(item.name);
                  if (activeModal === 'gastoYear') setGastoYear(item.name);
                  if (activeModal === 'gastoMonth') setGastoMonth(item.value);
                  setActiveModal(null);
                }}>
                  <ThemedText style={styles.modalItemText}>{item.name}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainTitle: { padding: 20, paddingBottom: 10 },
  filterSection: { padding: 15, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
  row: { flexDirection: 'row', gap: 10 },
  selectorContainer: { flex: 1, marginBottom: 10 },
  selectorLabel: { fontSize: 10, fontWeight: 'bold', color: '#999', marginBottom: 4, textTransform: 'uppercase' },
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  selectorText: { fontSize: 13 },
  
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#eee' },
  cardOverdue: { backgroundColor: '#fff0f0', borderColor: '#ffc1c1' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  addressText: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  ownerText: { fontSize: 11, color: '#666', marginTop: 1 },
  overdueBadge: { backgroundColor: '#f8f9fa', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  overdueBadgeActive: { backgroundColor: '#dc3545' },
  overdueText: { color: '#dc3545', fontWeight: 'bold', fontSize: 11 },
  
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statusBox: { width: '15.5%', aspectRatio: 0.85, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderRadius: 8, borderWidth: 1, paddingTop: 4 },
  boxPaid: { backgroundColor: '#f0fff4', borderColor: '#dcfce7' },
  boxUnpaidSolid: { backgroundColor: '#dc3545', borderColor: '#b22222' }, // Solid Red Box
  boxWaived: { backgroundColor: '#eef9fb', borderColor: '#d1ecf1' },
  boxFuture: { backgroundColor: '#ffffff', borderColor: '#f0f0f0' },
  iconContainer: { height: 20, justifyContent: 'center' },
  monthAbbrText: { fontSize: 7, color: '#666', fontWeight: 'bold', textTransform: 'uppercase' },
  
  noData: { textAlign: 'center', marginTop: 50, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 10, maxHeight: '70%' },
  modalItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, textAlign: 'center' }
});