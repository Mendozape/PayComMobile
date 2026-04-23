import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect to detect screen focus
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE } from '../../../src/api/axios';

const API_URL = `${API_BASE}`;

const Reports = () => {
  // --- CONSTANTS & HELPERS ---
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const currentMonthNum = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // --- STATE VARIABLES ---
  const [fees, setFees] = useState([]);
  const [paymentType, setPaymentType] = useState("");
  const [reportType, setReportType] = useState("debtors");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [ingresoYear, setIngresoYear] = useState(currentYear);
  const [gastoMonth, setGastoMonth] = useState(currentMonthNum);
  const [gastoYear, setGastoYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState({
    expenses: [],
    total: 0,
    monthName: monthNames[currentMonthNum - 1],
    year: currentYear
  });

  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [showIngresoYearModal, setShowIngresoYearModal] = useState(false);
  const [showGastoMonthModal, setShowGastoMonthModal] = useState(false);
  const [showGastoYearModal, setShowGastoYearModal] = useState(false);

  // --- FOCUS RESET LOGIC ---
  /**
   * Reset all filter states every time the user enters the screen.
   * This prevents old report data from showing up when coming back from Home.
   */
  useFocusEffect(
    useCallback(() => {
      // Reset main report selections
      setPaymentType("");
      setData([]);
      setSearchTerm("");
      
      // Reset dates to current date
      setIngresoYear(currentYear);
      setGastoMonth(currentMonthNum);
      setGastoYear(currentYear);
      
      // Clear current expenses state
      setCurrentMonthExpenses({
        expenses: [],
        total: 0,
        monthName: monthNames[currentMonthNum - 1],
        year: currentYear
      });

      // Reload initial data like Fees list
      fetchFees();
    }, [])
  );

  const filteredData = data.filter(row =>
    row.full_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.fee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.comments || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    const num = Number(amount || 0);
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getPaymentDisplayType = (filterValue) => {
    if (filterValue && filterValue !== "Todos") {
      return filterValue;
    }
    if (filterValue === "Todos" && fees.length > 0) {
      const uniqueNames = [...new Set(fees.map(fee => fee.name))];
      return uniqueNames.length === 1 ? uniqueNames[0] : "Múltiples Cuotas";
    }
    return fees.length > 0 ? "Cuota" : "Sin Cuotas";
  };

  const currentPaymentDisplayName = getPaymentDisplayType(paymentType);

  const resetFilters = () => {
    setIngresoYear(currentYear);
    setData([]);
    setSearchTerm("");
  };

  const getLastMonthToConsider = (year) => {
    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth() + 1;

    if (year < thisYear) return 12;
    if (year > thisYear) return 0;
    return Math.max(0, thisMonth - 1);
  };

  const getRowMonthsOverdueUpToPrevMonth = (row) => {
    const lastMonth = getLastMonthToConsider(ingresoYear);
    if (lastMonth <= 0) return 0;

    let unpaidCount = 0;
    for (let m = 1; m <= lastMonth; m++) {
      const isRegistered = !!row[`month_${m}`];
      if (!isRegistered) unpaidCount++;
    }
    return unpaidCount;
  };

  const getRowMonthsOverdueBeforeYear = (row) => {
    return Number(row.months_overdue || 0);
  };

  const getTotalMonthsOverdue = (row) => {
    return getRowMonthsOverdueUpToPrevMonth(row) + getRowMonthsOverdueBeforeYear(row);
  };

  const getTotalDebt = (row) => {
    const totalMonths = getTotalMonthsOverdue(row);
    const feeAmount = Number(row.fee_amount || 0);
    return totalMonths * feeAmount;
  };

  // --- FETCH LOGIC ---

  const fetchExpenses = async (month = gastoMonth, year = gastoYear) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const url = `${API_URL}/reports/expenses?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = response.data;

      if (json.expenses) {
        const monthIndex = Number(json.month) - 1;
        setCurrentMonthExpenses({
          expenses: json.expenses || [],
          total: json.total ?? 0,
          monthName: json.month_name || monthNames[monthIndex < 0 ? 0 : monthIndex],
          year: json.year || year,
        });
      } else {
        setCurrentMonthExpenses({
          expenses: [],
          total: 0,
          monthName: monthNames[(Number(month) - 1) % 12],
          year
        });
      }
    } catch (err) {
      console.error("Error fetching monthly expenses:", err);
    }
  };

  const fetchReport = async () => {
    if (!paymentType || reportType !== "debtors") {
      setData([]);
      return;
    }

    setLoading(true);
    const encodedPaymentType = encodeURIComponent(paymentType);
    const url = `${API_URL}/reports/debtors?payment_type=${encodedPaymentType}&year=${ingresoYear}`;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = response.data;

      const filteredData = Array.isArray(json.data)
        ? json.data.filter(row => row.name !== "Total" && row.total !== "Total")
        : [];
      setData(filteredData);
    } catch (err) {
      console.error("Error fetching report:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFees(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      console.error("Error fetching fees:", err);
      setFees([]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFees();
  }, []);

  // Fetch report data when main dependencies change
  useEffect(() => {
    const delay = setTimeout(() => {
      if (paymentType && reportType === "debtors") {
        fetchReport();
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [paymentType, reportType, ingresoYear]);

  // Fetch expenses data when date dependencies change
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchExpenses(gastoMonth, gastoYear);
    }, 200);
    return () => clearTimeout(delay);
  }, [gastoMonth, gastoYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReport(), fetchExpenses(gastoMonth, gastoYear)]);
    setRefreshing(false);
  };

  // --- RENDER MODALS ---

  const renderPaymentTypeModal = () => (
    <Modal visible={showPaymentTypeModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Seleccionar Tipo de Pago</ThemedText>
          <FlatList
            data={[{ id: 'todos', name: 'Todos' }, ...fees]}
            keyExtractor={(item) => item.id?.toString() || item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setPaymentType(item.name === 'Todos' ? 'Todos' : item.name);
                  setReportType("debtors");
                  resetFilters();
                  setShowPaymentTypeModal(false);
                }}
              >
                <ThemedText style={styles.modalItemText}>
                  {item.name}{item.deleted_at && ` (Inactivo)`}
                </ThemedText>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowPaymentTypeModal(false)}>
            <ThemedText style={styles.closeButtonText}>Cerrar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderYearModal = (visible, setVisible, value, setValue, title) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>{title}</ThemedText>
          <FlatList
            data={Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setValue(item);
                  setVisible(false);
                }}
              >
                <ThemedText style={[
                  styles.modalItemText,
                  value === item && styles.selectedItemText
                ]}>
                  {item}
                </ThemedText>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)}>
            <ThemedText style={styles.closeButtonText}>Cerrar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderMonthModal = () => (
    <Modal visible={showGastoMonthModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Seleccionar Mes - Gastos</ThemedText>
          <FlatList
            data={monthNames}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setGastoMonth(index + 1);
                  setShowGastoMonthModal(false);
                }}
              >
                <ThemedText style={[
                  styles.modalItemText,
                  gastoMonth === index + 1 && styles.selectedItemText
                ]}>
                  {item}
                </ThemedText>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowGastoMonthModal(false)}>
            <ThemedText style={styles.closeButtonText}>Cerrar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // --- RENDER TABLE ---

  const renderDebtorsTable = () => {
    if (filteredData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            {searchTerm ? `No se encontraron registros que coincidan con "${searchTerm}"` : "No hay datos disponibles para los filtros seleccionados."}
          </ThemedText>
        </View>
      );
    }

    const monthlyCalendarTotals = Array(12).fill(0);
    
    const rows = filteredData.map((row, i) => {
      let rowTotalPaid = 0;
      const feeAmount = Number(row.fee_amount || 0);
      const totalMonthsOverdue = getTotalMonthsOverdue(row);
      const totalDebtValue = getTotalDebt(row);
      const monthsOverdueBeforeYear = getRowMonthsOverdueBeforeYear(row);

      for (let m = 1; m <= 12; m++) {
        if (row[`month_${m}`]) {
          rowTotalPaid += Number(row[`month_${m}_amount_paid`] ?? feeAmount);
        }
        const calendarAmount = Number(row[`total_paid_in_month_${m}`] || 0);
        monthlyCalendarTotals[m - 1] += calendarAmount;
      }

      return (
        <View key={i} style={styles.tableRow}>
          <View style={[styles.tableCell, styles.cellAddress]}>
            <ThemedText style={styles.cellText}>{row.full_address}</ThemedText>
          </View>
          <View style={[styles.tableCell, styles.cellPaymentType]}>
            <ThemedText style={styles.cellText}>{row.fee_name || currentPaymentDisplayName}</ThemedText>
          </View>
          <View style={[styles.tableCell, styles.cellOverdueBefore, monthsOverdueBeforeYear > 0 && styles.dangerBg]}>
            <ThemedText style={[styles.cellTextCenter, monthsOverdueBeforeYear > 0 && styles.whiteText]}>
              {monthsOverdueBeforeYear}
            </ThemedText>
          </View>
          {Array.from({ length: 12 }, (_, m) => m + 1).map(monthNum => {
            const isRegistered = !!row[`month_${monthNum}`];
            const paymentDateStr = row[`month_${monthNum}_date`];
            const amountPaid = Number(row[`month_${monthNum}_amount_paid`] ?? feeAmount);
            const status = row[`month_${monthNum}_status`];
            const lastMonth = getLastMonthToConsider(ingresoYear);
            const isTrulyOverdue = monthNum <= lastMonth;

            if (isRegistered) {
              const isWaived = status === 'Condonado' || amountPaid === 0;
              return (
                <View key={`m${monthNum}-${i}`} style={[styles.tableCell, styles.cellMonth, isWaived && styles.infoBg]}>
                  <View style={styles.monthCellContent}>
                    <ThemedText style={[styles.cellTextCenter, isWaived && styles.whiteText]}>✓</ThemedText>
                    {paymentDateStr && (
                      <ThemedText style={[styles.smallText, isWaived && styles.whiteText]}>
                        {new Date(paymentDateStr).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                      </ThemedText>
                    )}
                    {!isWaived && amountPaid > 0 && (
                      <ThemedText style={[styles.smallText, styles.successText]}>
                        {formatCurrency(amountPaid)}
                      </ThemedText>
                    )}
                  </View>
                </View>
              );
            } else {
              return (
                <View key={`m${monthNum}-${i}`} style={[styles.tableCell, styles.cellMonth, isTrulyOverdue && styles.dangerBg]}>
                  <ThemedText style={[styles.cellTextCenter, isTrulyOverdue && styles.whiteText]}>
                    {isTrulyOverdue ? '✗' : '-'}
                  </ThemedText>
                </View>
              );
            }
          })}
          <View style={[styles.tableCell, styles.cellTotalPaid]}>
            <ThemedText style={[styles.cellTextCenter, styles.successText]}>
              {formatCurrency(rowTotalPaid)}
            </ThemedText>
          </View>
          <View style={[styles.tableCell, styles.cellMonthsOverdue, totalMonthsOverdue > 0 && styles.dangerBg]}>
            <ThemedText style={[styles.cellTextCenter, totalMonthsOverdue > 0 && styles.whiteText]}>
              {totalMonthsOverdue}
            </ThemedText>
          </View>
          <View style={[styles.tableCell, styles.cellDebt, totalDebtValue > 0 && styles.dangerBg]}>
            <ThemedText style={[styles.cellTextCenter, totalDebtValue > 0 && styles.whiteText]}>
              {formatCurrency(totalDebtValue)}
            </ThemedText>
          </View>
          <View style={[styles.tableCell, styles.cellComments]}>
            <ThemedText style={styles.cellText}>{row.comments || '-'}</ThemedText>
          </View>
        </View>
      );
    });

    const grandTotalPaidDisplayed = monthlyCalendarTotals.reduce((sum, val) => sum + val, 0);
    const totalDebtSum = filteredData.reduce((s, r) => s + getTotalDebt(r), 0);
    const grandTotalMonthsOverdue = filteredData.reduce((sum, row) => sum + getTotalMonthsOverdue(row), 0);
    const grandTotalMonthsOverdueBeforeYear = filteredData.reduce((sum, row) => sum + getRowMonthsOverdueBeforeYear(row), 0);

    const totalRow = (
      <View key="total-row" style={[styles.tableRow, styles.totalRow]}>
        <View style={[styles.tableCell, styles.cellAddress]}>
          <ThemedText style={[styles.cellText, styles.boldText, styles.primaryText]}>
            INGRESOS (ACUMULADO {ingresoYear}):
          </ThemedText>
        </View>
        <View style={[styles.tableCell, styles.cellPaymentType]} />
        <View style={[styles.tableCell, styles.cellOverdueBefore, grandTotalMonthsOverdueBeforeYear > 0 && styles.dangerBg]}>
          <ThemedText style={[styles.cellTextCenter, grandTotalMonthsOverdueBeforeYear > 0 && styles.whiteText, styles.boldText]}>
            {grandTotalMonthsOverdueBeforeYear}
          </ThemedText>
        </View>
        {monthlyCalendarTotals.map((total, idx) => {
          const isCurrentMonth = (idx + 1) === currentMonthNum && ingresoYear === currentYear;
          return (
            <View key={`mt-${idx}`} style={[styles.tableCell, styles.cellMonth, isCurrentMonth && styles.warningBg]}>
              <ThemedText style={[styles.cellTextCenter, total > 0 && styles.successText]}>
                {total > 0 ? formatCurrency(total) : '-'}
              </ThemedText>
            </View>
          );
        })}
        <View style={[styles.tableCell, styles.cellTotalPaid]}>
          <ThemedText style={[styles.cellTextCenter, styles.boldText]}>
            {formatCurrency(grandTotalPaidDisplayed)}
          </ThemedText>
        </View>
        <View style={[styles.tableCell, styles.cellMonthsOverdue, grandTotalMonthsOverdue > 0 && styles.dangerBg]}>
          <ThemedText style={[styles.cellTextCenter, grandTotalMonthsOverdue > 0 && styles.whiteText, styles.boldText]}>
            {grandTotalMonthsOverdue}
          </ThemedText>
        </View>
        <View style={[styles.tableCell, styles.cellDebt, totalDebtSum > 0 && styles.dangerBg]}>
          <ThemedText style={[styles.cellTextCenter, totalDebtSum > 0 && styles.whiteText, styles.boldText]}>
            {formatCurrency(totalDebtSum)}
          </ThemedText>
        </View>
        <View style={[styles.tableCell, styles.cellComments]} />
      </View>
    );

    const expensesToDisplay = currentMonthExpenses.expenses || [];
    const expenseMonthDisplay = currentMonthExpenses.monthName;
    const expenseYearDisplay = currentMonthExpenses.year;
    const monthlyIncomeForBalance = monthlyCalendarTotals[gastoMonth - 1] || 0;
    const saldo = monthlyIncomeForBalance - currentMonthExpenses.total;
    const saldoBgClass = saldo >= 0 ? styles.successBg : styles.dangerBg;

    const expenseSection = (expensesToDisplay.length > 0 || currentMonthExpenses.total > 0) ? (
      <View key="expenses-section">
        <View style={[styles.tableRow, styles.expenseHeader]}>
          <View style={[styles.tableCell, { flex: 1 }]}>
            <ThemedText style={[styles.cellTextCenter, styles.whiteText, styles.boldText]}>
              GASTOS ({expenseMonthDisplay.toUpperCase()} {expenseYearDisplay})
            </ThemedText>
          </View>
        </View>
        {expensesToDisplay.map((expense, expIndex) => (
          <View key={`expense-${expIndex}`} style={styles.tableRow}>
            <View style={[styles.tableCell, { flex: 0.5 }]}>
              <ThemedText style={[styles.cellText, styles.dangerText]}>
                ➖ {expense.category?.name || expense.category || 'Gasto'}
              </ThemedText>
              <ThemedText style={styles.smallText}>{expense.description}</ThemedText>
            </View>
            <View style={[styles.tableCell, { flex: 0.3, alignItems: 'flex-end' }]}>
              <ThemedText style={[styles.cellText, styles.dangerText, styles.boldText]}>
                {formatCurrency(expense.amount)}
              </ThemedText>
              <ThemedText style={styles.smallText}>
                {new Date(expense.expense_date).toLocaleDateString('es-MX')}
              </ThemedText>
            </View>
            <View style={[styles.tableCell, { flex: 0.2 }]} />
          </View>
        ))}
        <View style={[styles.tableRow, styles.expenseTotalRow]}>
          <View style={[styles.tableCell, { flex: 0.7, alignItems: 'flex-end' }]}>
            <ThemedText style={[styles.cellText, styles.whiteText, styles.boldText]}>
              TOTAL GASTOS:
            </ThemedText>
          </View>
          <View style={[styles.tableCell, { flex: 0.3, alignItems: 'flex-end' }]}>
            <ThemedText style={[styles.cellText, styles.whiteText, styles.boldText]}>
              {formatCurrency(currentMonthExpenses.total)}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.tableRow, saldoBgClass]}>
          <View style={[styles.tableCell, { flex: 0.7, alignItems: 'flex-start' }]}>
            <ThemedText style={[styles.cellText, styles.whiteText, styles.boldText]}>
              SALDO FINAL ({expenseMonthDisplay}):
            </ThemedText>
          </View>
          <View style={[styles.tableCell, { flex: 0.3, alignItems: 'flex-end' }]}>
            <ThemedText style={[styles.cellText, styles.whiteText, styles.boldText]}>
              {formatCurrency(saldo)}
            </ThemedText>
          </View>
        </View>
      </View>
    ) : (
      <View key="no-expenses" style={[styles.tableRow, styles.emptyRow]}>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <ThemedText style={[styles.cellTextCenter, styles.mutedText]}>
            No hay gastos para {monthNames[gastoMonth - 1]} de {gastoYear}.
          </ThemedText>
        </View>
      </View>
    );

    return (
      <>
        {rows}
        {totalRow}
        {expenseSection}
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText style={styles.title}>📊 Reportes</ThemedText>

        <View style={styles.paramsCard}>
          <ThemedText style={styles.sectionTitle}>Parámetros</ThemedText>
          <View style={styles.paramRow}>
            <ThemedText style={styles.label}>Tipo de Pago</ThemedText>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPaymentTypeModal(true)}
            >
              <ThemedText style={paymentType ? styles.selectorText : styles.selectorPlaceholder}>
                {paymentType || "-- Seleccionar --"}
              </ThemedText>
              <IconSymbol name="chevron.down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {paymentType ? (
            <View style={styles.dateFilters}>
              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <ThemedText style={[styles.label, styles.primaryLabel]}>Año Ingresos</ThemedText>
                  <TouchableOpacity style={styles.selectorSmall} onPress={() => setShowIngresoYearModal(true)}>
                    <ThemedText>{ingresoYear}</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.filterItem}>
                  <ThemedText style={[styles.label, styles.dangerLabel]}>Mes Gastos</ThemedText>
                  <TouchableOpacity style={styles.selectorSmall} onPress={() => setShowGastoMonthModal(true)}>
                    <ThemedText>{monthNames[gastoMonth - 1]}</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {paymentType ? (
          <View style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <ThemedText style={styles.resultsTitle}>
                RESULTADOS {ingresoYear}
              </ThemedText>
            </View>
            <View style={styles.resultsBody}>
              {loading ? (
                <ActivityIndicator size="large" color="#28a745" style={styles.loader} />
              ) : (
                <>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      <View style={styles.tableHeader}>
                        <View style={[styles.headerCell, styles.cellAddress]}><ThemedText style={styles.headerText}>Predio</ThemedText></View>
                        <View style={[styles.headerCell, styles.cellPaymentType]}><ThemedText style={styles.headerText}>Tipo</ThemedText></View>
                        <View style={[styles.headerCell, styles.cellOverdueBefore]}><ThemedText style={styles.headerText}>Prev</ThemedText></View>
                        {monthNames.map((m, i) => (
                          <View key={i} style={[styles.headerCell, styles.cellMonth]}><ThemedText style={styles.headerText}>{m.substring(0, 3)}</ThemedText></View>
                        ))}
                        <View style={[styles.headerCell, styles.cellTotalPaid]}><ThemedText style={styles.headerText}>Total</ThemedText></View>
                        <View style={[styles.headerCell, styles.cellMonthsOverdue]}><ThemedText style={styles.headerText}>Meses</ThemedText></View>
                        <View style={[styles.headerCell, styles.cellDebt]}><ThemedText style={styles.headerText}>Deuda</ThemedText></View>
                        <View style={[styles.headerCell, styles.cellComments]}><ThemedText style={styles.headerText}>Notas</ThemedText></View>
                      </View>
                      {renderDebtorsTable()}
                    </View>
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {renderPaymentTypeModal()}
      {renderYearModal(showIngresoYearModal, setShowIngresoYearModal, ingresoYear, setIngresoYear, "Año Ingresos")}
      {renderYearModal(showGastoYearModal, setShowGastoYearModal, gastoYear, setGastoYear, "Año Gastos")}
      {renderMonthModal()}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', marginBottom: 16 },
  paramsCard: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 12 },
  paramRow: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  primaryLabel: { color: '#007AFF' },
  dangerLabel: { color: '#DC3545' },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  selectorSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#ddd', minWidth: 100 },
  selectorText: { fontSize: 16, color: '#333' },
  selectorPlaceholder: { fontSize: 16, color: '#aaa' },
  dateFilters: { borderTopWidth: 1, borderTopColor: '#ddd', marginTop: 12, paddingTop: 12 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  filterItem: { flex: 1 },
  resultsCard: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden', marginBottom: 20 },
  resultsHeader: { backgroundColor: '#333', padding: 12 },
  resultsTitle: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
  resultsBody: { padding: 12 },
  searchInput: { backgroundColor: '#f2f2f2', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 },
  loader: { marginVertical: 40 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', textAlign: 'center' },
  emptyRow: { padding: 20, backgroundColor: '#f9f9f9' },
  mutedText: { color: '#999', fontStyle: 'italic' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e9ecef', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerCell: { padding: 8, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#ddd' },
  headerText: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', minHeight: 50 },
  tableCell: { padding: 6, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#eee' },
  cellText: { fontSize: 10 },
  cellTextCenter: { fontSize: 10, textAlign: 'center' },
  boldText: { fontWeight: 'bold' },
  whiteText: { color: '#fff' },
  successText: { color: '#28a745' },
  dangerText: { color: '#DC3545' },
  primaryText: { color: '#007AFF' },
  smallText: { fontSize: 8, color: '#666', marginTop: 2 },
  monthCellContent: { alignItems: 'center' },
  dangerBg: { backgroundColor: '#DC3545' },
  successBg: { backgroundColor: '#28a745' },
  warningBg: { backgroundColor: '#FFC107' },
  infoBg: { backgroundColor: '#17A2B8' },
  totalRow: { backgroundColor: '#f8f9fa' },
  expenseHeader: { backgroundColor: '#343a40' },
  expenseTotalRow: { backgroundColor: '#6c757d' },
  cellAddress: { width: 120, minWidth: 120 },
  cellPaymentType: { width: 80, minWidth: 80 },
  cellOverdueBefore: { width: 60, minWidth: 60 },
  cellMonth: { width: 55, minWidth: 55 },
  cellTotalPaid: { width: 70, minWidth: 70 },
  cellMonthsOverdue: { width: 60, minWidth: 60 },
  cellDebt: { width: 80, minWidth: 80 },
  cellComments: { width: 100, minWidth: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%', maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  selectedItemText: { color: '#28a745', fontWeight: 'bold' },
  closeButton: { backgroundColor: '#28a745', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default Reports;