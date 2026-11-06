with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update initial bikeDraft state
old_bike_draft = """  const [bikeDraft, setBikeDraft] = useState<BikeExpenseItem>({
    id: '',
    name: '',
    category: 'manutencao',
    monthlyAmount: 0,
    dueDay: 15,
    icon: '🏍️',
    isActive: true,
  });"""

new_bike_draft = """  const [bikeDraft, setBikeDraft] = useState<BikeExpenseItem>({
    id: '',
    name: '',
    category: 'manutencao',
    monthlyAmount: 75,
    recurrenceType: 'interval_days',
    dueDay: 15,
    intervalDays: 120,
    totalCost: 300,
    lastPaidDate: todayStr(),
    nextDueDate: addDaysToDateStr(todayStr(), 120),
    icon: '🏍️',
    isActive: true,
  });"""

assert old_bike_draft in content, "old_bike_draft not found"
content = content.replace(old_bike_draft, new_bike_draft, 1)

# 2. Update initial householdDraft state
old_house_draft = """  const [householdDraft, setHouseholdDraft] = useState<HouseholdExpenseItem>({
    id: '',
    name: '',
    category: 'moradia',
    monthlyAmount: 0,
    dueDay: 10,
    icon: '🏠',
    isActive: true,
  });"""

new_house_draft = """  const [householdDraft, setHouseholdDraft] = useState<HouseholdExpenseItem>({
    id: '',
    name: '',
    category: 'moradia',
    monthlyAmount: 0,
    recurrenceType: 'monthly',
    dueDay: 10,
    intervalDays: 30,
    totalCost: 0,
    lastPaidDate: todayStr(),
    nextDueDate: addDaysToDateStr(todayStr(), 30),
    icon: '🏠',
    isActive: true,
  });"""

assert old_house_draft in content, "old_house_draft not found"
content = content.replace(old_house_draft, new_house_draft, 1)

# 3. Update openNewBikeExpenseModal, saveBikeExpense, openNewBikePaymentModal
old_bike_handlers = """  // ================= BIKE / DESPESAS DA MOTO HANDLERS =================
  const openNewBikeExpenseModal = () => {
    setEditingBikeItem(null);
    setBikeDraft({
      id: 'bike_' + Date.now(),
      name: '',
      category: 'manutencao',
      monthlyAmount: 0,
      dueDay: 15,
      icon: '🏍️',
      isActive: true,
    });
    setShowBikeModal(true);
  };

  const openEditBikeExpenseModal = (item: BikeExpenseItem) => {
    setEditingBikeItem(item);
    setBikeDraft({ ...item });
    setShowBikeModal(true);
  };

  const saveBikeExpense = () => {
    const list = Array.isArray(dbState.bikeExpenses) && dbState.bikeExpenses.length > 0
      ? [...dbState.bikeExpenses]
      : DEFAULT_BIKE_EXPENSES.map(b => ({ ...b }));

    const sanitized: BikeExpenseItem = {
      id: bikeDraft.id || 'bike_' + Date.now(),
      name: bikeDraft.name.trim() || 'Despesa da Moto',
      category: bikeDraft.category || 'outros',
      monthlyAmount: Math.max(0, Number(bikeDraft.monthlyAmount) || 0),
      dueDay: Math.max(1, Math.min(31, Number(bikeDraft.dueDay) || 15)),
      icon: bikeDraft.icon?.trim() || '🏍️',
      isActive: bikeDraft.isActive !== false,
    };

    const existingIndex = list.findIndex(b => b.id === sanitized.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitized;
    } else {
      list.push(sanitized);
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
    setShowBikeModal(false);
    setEditingBikeItem(null);
  };

  const deleteBikeExpense = (id: string) => {
    const currentList = Array.isArray(dbState.bikeExpenses) && dbState.bikeExpenses.length > 0
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;
    const list = currentList.filter(b => b.id !== id);
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
  };

  const toggleBikeExpense = (id: string) => {
    const currentList = Array.isArray(dbState.bikeExpenses) && dbState.bikeExpenses.length > 0
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;
    const list = currentList.map(b =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
  };

  const resetDefaultBikeExpenses = () => {
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: DEFAULT_BIKE_EXPENSES.map(b => ({ ...b })),
    });
  };

  const openNewBikePaymentModal = (item: BikeExpenseItem) => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setExpenseType('moto');
    setSelectedCategory(item.name);
    setEntryDate(todayStr());
    setExpenseAmount(item.monthlyAmount > 0 ? String(item.monthlyAmount) : '');
    setExpenseDescription(`Pagamento / Manutenção: ${item.name}`);
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setShowEntryModal(true);
  };"""

new_bike_handlers = """  // ================= BIKE / DESPESAS DA MOTO HANDLERS =================
  const openNewBikeExpenseModal = () => {
    setEditingBikeItem(null);
    setBikeDraft({
      id: 'bike_' + Date.now(),
      name: '',
      category: 'manutencao',
      monthlyAmount: 75,
      recurrenceType: 'interval_days',
      dueDay: 15,
      intervalDays: 120,
      totalCost: 300,
      lastPaidDate: todayStr(),
      nextDueDate: addDaysToDateStr(todayStr(), 120),
      icon: '🏍️',
      isActive: true,
    });
    setShowBikeModal(true);
  };

  const openEditBikeExpenseModal = (item: BikeExpenseItem) => {
    setEditingBikeItem(item);
    const recType = item.recurrenceType || (item.intervalDays ? 'interval_days' : 'monthly');
    const intervalDays = item.intervalDays || 90;
    const totalCost = item.totalCost || (recType === 'interval_days' && item.monthlyAmount ? Math.round(item.monthlyAmount * (intervalDays / 30)) : item.monthlyAmount);
    const lastDate = item.lastPaidDate || todayStr();
    const nextDate = item.nextDueDate || addDaysToDateStr(lastDate, intervalDays);
    setBikeDraft({
      ...item,
      recurrenceType: recType,
      intervalDays,
      totalCost,
      lastPaidDate: lastDate,
      nextDueDate: nextDate,
    });
    setShowBikeModal(true);
  };

  const saveBikeExpense = () => {
    const list = Array.isArray(dbState.bikeExpenses) && dbState.bikeExpenses.length > 0
      ? [...dbState.bikeExpenses]
      : DEFAULT_BIKE_EXPENSES.map(b => ({ ...b }));

    const recType: ExpenseRecurrenceType = bikeDraft.recurrenceType || 'monthly';
    const intervalDays = Math.max(1, Number(bikeDraft.intervalDays) || 90);
    const totalCost = Math.max(0, Number(bikeDraft.totalCost) || Number(bikeDraft.monthlyAmount) || 0);
    const calculatedMonthly = recType === 'interval_days'
      ? Math.round((totalCost / intervalDays) * 30 * 100) / 100
      : Math.max(0, Number(bikeDraft.monthlyAmount) || 0);

    const lastPaid = bikeDraft.lastPaidDate || todayStr();
    const nextDue = recType === 'interval_days'
      ? (bikeDraft.nextDueDate || addDaysToDateStr(lastPaid, intervalDays))
      : (bikeDraft.nextDueDate || getDefaultFutureDate(30));

    const sanitized: BikeExpenseItem = {
      id: bikeDraft.id || 'bike_' + Date.now(),
      name: bikeDraft.name.trim() || 'Despesa da Moto',
      category: bikeDraft.category || 'outros',
      monthlyAmount: calculatedMonthly,
      recurrenceType: recType,
      dueDay: Math.max(1, Math.min(31, Number(bikeDraft.dueDay) || 15)),
      intervalDays: recType === 'interval_days' ? intervalDays : undefined,
      totalCost: totalCost,
      lastPaidDate: lastPaid,
      nextDueDate: recType !== 'monthly' ? nextDue : undefined,
      icon: bikeDraft.icon?.trim() || '🏍️',
      isActive: bikeDraft.isActive !== false,
    };

    const existingIndex = list.findIndex(b => b.id === sanitized.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitized;
    } else {
      list.push(sanitized);
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
    setShowBikeModal(false);
    setEditingBikeItem(null);
  };

  const deleteBikeExpense = (id: string) => {
    const currentList = Array.isArray(dbState.bikeExpenses) && dbState.bikeExpenses.length > 0
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;
    const list = currentList.filter(b => b.id !== id);
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
  };

  const toggleBikeExpense = (id: string) => {
    const currentList = Array.isArray(dbState.bikeExpenses) && dbState.bikeExpenses.length > 0
      ? dbState.bikeExpenses
      : DEFAULT_BIKE_EXPENSES;
    const list = currentList.map(b =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: list,
    });
  };

  const resetDefaultBikeExpenses = () => {
    persistAndEnqueueWorkManager({
      ...dbState,
      bikeExpenses: DEFAULT_BIKE_EXPENSES.map(b => ({ ...b })),
    });
  };

  const openNewBikePaymentModal = (item: BikeExpenseItem) => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setExpenseType('moto');
    setSelectedCategory(item.name);
    setEntryDate(todayStr());
    const payAmt = item.totalCost && item.totalCost > 0 ? item.totalCost : item.monthlyAmount;
    setExpenseAmount(payAmt > 0 ? String(payAmt) : '');
    setExpenseDescription(
      item.recurrenceType === 'interval_days'
        ? `Troca / Peça: ${item.name} (a cada ${item.intervalDays || 90} dias)`
        : `Pagamento / Manutenção: ${item.name}`
    );
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setShowEntryModal(true);
  };"""

assert old_bike_handlers in content, "old_bike_handlers not found"
content = content.replace(old_bike_handlers, new_bike_handlers, 1)

# 4. Update household handlers
old_house_handlers = """  // ================= HOUSEHOLD / CUSTO DE VIDA DA CASA HANDLERS =================
  const openNewHouseholdExpenseModal = () => {
    setEditingHouseholdItem(null);
    setHouseholdDraft({
      id: 'house_' + Date.now(),
      name: '',
      category: 'moradia',
      monthlyAmount: 0,
      dueDay: 10,
      icon: '🏠',
      isActive: true,
    });
    setShowHouseholdModal(true);
  };

  const openEditHouseholdExpenseModal = (item: HouseholdExpenseItem) => {
    setEditingHouseholdItem(item);
    setHouseholdDraft({ ...item });
    setShowHouseholdModal(true);
  };

  const saveHouseholdExpense = () => {
    const list = Array.isArray(dbState.householdExpenses)
      ? [...dbState.householdExpenses]
      : DEFAULT_HOUSEHOLD_EXPENSES.map(h => ({ ...h }));

    const sanitized: HouseholdExpenseItem = {
      id: householdDraft.id || 'house_' + Date.now(),
      name: householdDraft.name.trim() || 'Despesa Doméstica',
      category: householdDraft.category || 'outros',
      monthlyAmount: Math.max(0, Number(householdDraft.monthlyAmount) || 0),
      dueDay: Math.max(1, Math.min(31, Number(householdDraft.dueDay) || 10)),
      icon: householdDraft.icon?.trim() || '🏠',
      isActive: householdDraft.isActive !== false,
    };

    const existingIndex = list.findIndex(h => h.id === sanitized.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitized;
    } else {
      list.push(sanitized);
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: list,
    });
    setShowHouseholdModal(false);
    setEditingHouseholdItem(null);
  };"""

new_house_handlers = """  // ================= HOUSEHOLD / CUSTO DE VIDA DA CASA HANDLERS =================
  const openNewHouseholdExpenseModal = () => {
    setEditingHouseholdItem(null);
    setHouseholdDraft({
      id: 'house_' + Date.now(),
      name: '',
      category: 'moradia',
      monthlyAmount: 0,
      recurrenceType: 'monthly',
      dueDay: 10,
      intervalDays: 30,
      totalCost: 0,
      lastPaidDate: todayStr(),
      nextDueDate: addDaysToDateStr(todayStr(), 30),
      icon: '🏠',
      isActive: true,
    });
    setShowHouseholdModal(true);
  };

  const openEditHouseholdExpenseModal = (item: HouseholdExpenseItem) => {
    setEditingHouseholdItem(item);
    const recType = item.recurrenceType || (item.intervalDays ? 'interval_days' : 'monthly');
    const intervalDays = item.intervalDays || 30;
    const totalCost = item.totalCost || (recType === 'interval_days' && item.monthlyAmount ? Math.round(item.monthlyAmount * (intervalDays / 30)) : item.monthlyAmount);
    const lastDate = item.lastPaidDate || todayStr();
    const nextDate = item.nextDueDate || addDaysToDateStr(lastDate, intervalDays);
    setHouseholdDraft({
      ...item,
      recurrenceType: recType,
      intervalDays,
      totalCost,
      lastPaidDate: lastDate,
      nextDueDate: nextDate,
    });
    setShowHouseholdModal(true);
  };

  const saveHouseholdExpense = () => {
    const list = Array.isArray(dbState.householdExpenses)
      ? [...dbState.householdExpenses]
      : DEFAULT_HOUSEHOLD_EXPENSES.map(h => ({ ...h }));

    const recType: ExpenseRecurrenceType = householdDraft.recurrenceType || 'monthly';
    const intervalDays = Math.max(1, Number(householdDraft.intervalDays) || 30);
    const totalCost = Math.max(0, Number(householdDraft.totalCost) || Number(householdDraft.monthlyAmount) || 0);
    const calculatedMonthly = recType === 'interval_days'
      ? Math.round((totalCost / intervalDays) * 30 * 100) / 100
      : Math.max(0, Number(householdDraft.monthlyAmount) || 0);

    const lastPaid = householdDraft.lastPaidDate || todayStr();
    const nextDue = recType === 'interval_days'
      ? (householdDraft.nextDueDate || addDaysToDateStr(lastPaid, intervalDays))
      : (householdDraft.nextDueDate || getDefaultFutureDate(30));

    const sanitized: HouseholdExpenseItem = {
      id: householdDraft.id || 'house_' + Date.now(),
      name: householdDraft.name.trim() || 'Despesa Doméstica',
      category: householdDraft.category || 'outros',
      monthlyAmount: calculatedMonthly,
      recurrenceType: recType,
      dueDay: Math.max(1, Math.min(31, Number(householdDraft.dueDay) || 10)),
      intervalDays: recType === 'interval_days' ? intervalDays : undefined,
      totalCost: totalCost,
      lastPaidDate: lastPaid,
      nextDueDate: recType !== 'monthly' ? nextDue : undefined,
      icon: householdDraft.icon?.trim() || '🏠',
      isActive: householdDraft.isActive !== false,
    };

    const existingIndex = list.findIndex(h => h.id === sanitized.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sanitized;
    } else {
      list.push(sanitized);
    }

    persistAndEnqueueWorkManager({
      ...dbState,
      householdExpenses: list,
    });
    setShowHouseholdModal(false);
    setEditingHouseholdItem(null);
  };"""

assert old_house_handlers in content, "old_house_handlers not found"
content = content.replace(old_house_handlers, new_house_handlers, 1)

# 5. Update openNewHouseholdPaymentModal
old_house_pay = """  const openNewHouseholdPaymentModal = (item: HouseholdExpenseItem) => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setExpenseType('casa');
    setSelectedHouseholdExpenseId(item.id);
    setSelectedCategory(item.name);
    setEntryDate(todayStr());
    setExpenseAmount(item.monthlyAmount > 0 ? String(item.monthlyAmount) : '');
    setExpenseDescription('');
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setShowEntryModal(true);
  };"""

new_house_pay = """  const openNewHouseholdPaymentModal = (item: HouseholdExpenseItem) => {
    setEditingEntryId(null);
    setEntryMode('gasto');
    setExpenseType('casa');
    setSelectedHouseholdExpenseId(item.id);
    setSelectedCategory(item.name);
    setEntryDate(todayStr());
    const payAmt = item.totalCost && item.totalCost > 0 ? item.totalCost : item.monthlyAmount;
    setExpenseAmount(payAmt > 0 ? String(payAmt) : '');
    setExpenseDescription(
      item.recurrenceType === 'interval_days'
        ? `Pagamento / Reposição: ${item.name} (a cada ${item.intervalDays || 30} dias)`
        : `Pagamento de conta: ${item.name}`
    );
    setShowNewHouseholdInModal(false);
    setNewHouseholdNameInModal('');
    setEntryModalFeedback(null);
    setShowEntryModal(true);
  };"""

assert old_house_pay in content, "old_house_pay not found"
content = content.replace(old_house_pay, new_house_pay, 1)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Phase 1 applied successfully!")
