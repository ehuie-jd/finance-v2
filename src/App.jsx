import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, ArrowDownRight, ArrowUpRight, PieChart, 
  History, AlertCircle, CheckCircle2, X, Filter,
  Settings, RefreshCw, Cloud, Lock, KeyRound,
  ClipboardList, PlusCircle, Clock, PlayCircle, CheckCircle, User, Printer,
  Users, Package, AlertTriangle, Plus, Minus, Trash2, FileText, Download, Zap,
  MessageCircle, Receipt, DollarSign
} from 'lucide-react';

// --- CONFIGURATION ---
const ACCOUNTS_CONFIG = [
  { id: 'fr_volatile', name: 'FR Volatile', parent: 'Fonctionnement (45%)', displayPercent: '80%', percent: 0.36, color: 'bg-blue-500', textColor: 'text-blue-600', borderColor: 'border-blue-200' },
  { id: 'fr_immobilise', name: 'FR Immobilisé', parent: 'Fonctionnement (45%)', displayPercent: '20%', percent: 0.09, color: 'bg-indigo-500', textColor: 'text-indigo-600', borderColor: 'border-indigo-200' },
  { id: 'epargne_inv', name: 'Épargne Investissement', parent: 'Épargnes (20%)', displayPercent: '60%', percent: 0.12, color: 'bg-emerald-500', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
  { id: 'epargne_imm', name: 'Épargne Immobilisée', parent: 'Épargnes (20%)', displayPercent: '40%', percent: 0.08, color: 'bg-teal-500', textColor: 'text-teal-600', borderColor: 'border-teal-200' },
  { id: 'charges_fixes', name: 'Charges Fixes', parent: 'Charges Fixes (35%)', displayPercent: '', percent: 0.35, color: 'bg-rose-500', textColor: 'text-rose-600', borderColor: 'border-rose-200' },
];

const EXPENSE_CATEGORIES = ['Achat Marchandise', 'Transport', 'Loyer', 'Salaire', 'Maintenance', 'Fournitures Bureau', 'Autre'];

const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';

export default function App() {
  const [activeTab, setActiveTab] = useState('finances'); 

  // --- SÉCURITÉ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' ou 'employee'
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const PIN_ADMIN = "0125";
  const PIN_EMPLOYEE = "0101";

  // --- ÉTATS ---
  const [transactions, setTransactions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', type: 'error' });

  // Finances
  const [opDate, setOpDate] = useState(new Date().toISOString().split('T')[0]);
  const [opRecette, setOpRecette] = useState('');
  const [opDepense, setOpDepense] = useState('');
  const [opDesc, setOpDesc] = useState('');
  const [opCategory, setOpCategory] = useState('Autre');
  const [debDate, setDebDate] = useState(new Date().toISOString().split('T')[0]);
  const [debAccount, setDebAccount] = useState('fr_volatile');
  const [debAmount, setDebAmount] = useState('');
  const [debDesc, setDebDesc] = useState('');

  // Commandes
  const [orders, setOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [cmdClient, setCmdClient] = useState('');
  const [cmdDesc, setCmdDesc] = useState('');
  const [cmdTotal, setCmdTotal] = useState('');
  const [cmdAvance, setCmdAvance] = useState('');
  const [cmdDate, setCmdDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Paiement partiel
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Stock
  const [inventory, setInventory] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockName, setStockName] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockUnit, setStockUnit] = useState('Rames');
  const [stockThreshold, setStockThreshold] = useState('10');

  // Devis
  const [quotes, setQuotes] = useState([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteClient, setQuoteClient] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [quoteItems, setQuoteItems] = useState([{ id: Date.now(), desc: '', qty: 1, price: 0 }]);

  // Energie
  const [recharges, setRecharges] = useState([]);
  const [showPowerModal, setShowPowerModal] = useState(false);
  const [powDate, setPowDate] = useState(new Date().toISOString().split('T')[0]);
  const [powAmount, setPowAmount] = useState('');
  const [powKwh, setPowKwh] = useState('');
  const [powDesc, setPowDesc] = useState('Recharge Compteur');

  // Cloud Sync
  const [showSettings, setShowSettings] = useState(false);
  const defaultSyncUrl = 'https://script.google.com/macros/s/AKfycbxfTye97lUS8bBS90zM8ERD4A6CgCtMlvcrAzTIJb2lOYF4jROADPk8XoHw7E52Yb0fNA/exec';
  const [syncUrl, setSyncUrl] = useState(defaultSyncUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // --- INIT ---
  useEffect(() => {
    const savedRole = sessionStorage.getItem('imprim_role');
    if (sessionStorage.getItem('imprim_auth') === 'true' && savedRole) {
      setUserRole(savedRole);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const savedUrl = localStorage.getItem('finance_print_sync_url');
    if (savedUrl) setSyncUrl(savedUrl);

    try {
      const savedOrders = localStorage.getItem('finance_print_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      const savedStock = localStorage.getItem('finance_print_inventory');
      if (savedStock) setInventory(JSON.parse(savedStock));
      const savedQuotes = localStorage.getItem('finance_print_quotes');
      if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
      const savedPower = localStorage.getItem('finance_print_power');
      if (savedPower) setRecharges(JSON.parse(savedPower));
    } catch(e) {}

    const loadData = async () => {
      setIsSyncing(true);
      if (savedUrl || defaultSyncUrl) {
        try {
          const res = await fetch(savedUrl || defaultSyncUrl);
          const data = await res.json();
          if (Array.isArray(data)) setTransactions(data);
        } catch (error) {
          loadLocalTransactions();
        }
      } else loadLocalTransactions();
      setIsSyncing(false);
      setInitialLoadDone(true);
    };

    const loadLocalTransactions = () => {
      const saved = localStorage.getItem('finance_print_data');
      if (saved) try { setTransactions(JSON.parse(saved)); } catch (e) {}
    };

    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!initialLoadDone || !isAuthenticated) return;
    localStorage.setItem('finance_print_data', JSON.stringify(transactions));
    localStorage.setItem('finance_print_orders', JSON.stringify(orders));
    localStorage.setItem('finance_print_inventory', JSON.stringify(inventory));
    localStorage.setItem('finance_print_quotes', JSON.stringify(quotes));
    localStorage.setItem('finance_print_power', JSON.stringify(recharges));
    
    if (syncUrl) {
      const syncData = async () => {
        setIsSyncing(true);
        try { await fetch(syncUrl, { method: 'POST', body: JSON.stringify(transactions), headers: { 'Content-Type': 'text/plain;charset=utf-8' }}); } 
        catch (error) {} finally { setIsSyncing(false); }
      };
      const timeoutId = setTimeout(() => syncData(), 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [transactions, orders, inventory, quotes, recharges, syncUrl, initialLoadDone, isAuthenticated]);

  // --- AUTH ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (pinCode === PIN_ADMIN) {
      setUserRole('admin'); setIsAuthenticated(true); setPinError(false);
      sessionStorage.setItem('imprim_auth', 'true'); sessionStorage.setItem('imprim_role', 'admin');
    } else if (pinCode === PIN_EMPLOYEE) {
      setUserRole('employee'); setIsAuthenticated(true); setPinError(false);
      sessionStorage.setItem('imprim_auth', 'true'); sessionStorage.setItem('imprim_role', 'employee');
      setActiveTab('commandes'); // Employé démarre sur commandes
    } else {
      setPinError(true); setPinCode('');
      setTimeout(() => setPinError(false), 3000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false); setUserRole(null); setPinCode('');
    sessionStorage.clear();
  };

  const showAlert = (message, type = 'error') => {
    setAlertInfo({ show: true, message, type });
    setTimeout(() => setAlertInfo({ show: false, message: '', type: 'error' }), 5000);
  };

  const createTransaction = (recette, depense, description, date = new Date().toISOString().split('T')[0], category = 'Autre') => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    type: 'DAILY_OP', date, recette, depense, description, category
  });

  // --- STATS ---
  const caisseBalance = useMemo(() => transactions.reduce((acc, t) => {
    if (t.type === 'DAILY_OP') return acc + (t.recette || 0) - (t.depense || 0);
    if (t.type === 'REPARTITION') return acc - (t.amount || 0);
    return acc;
  }, 0), [transactions]);

  const accountBalances = useMemo(() => {
    const balances = ACCOUNTS_CONFIG.reduce((acc, conf) => ({ ...acc, [conf.id]: 0 }), {});
    transactions.forEach((t) => {
      if (t.type === 'REPARTITION' && t.amount) ACCOUNTS_CONFIG.forEach(conf => { balances[conf.id] += t.amount * conf.percent; });
      else if (t.type === 'DEBIT' && t.account && t.amount) balances[t.account] -= t.amount;
    });
    return balances;
  }, [transactions]);

  const monthlyStats = useMemo(() => {
    const stats = { recettes: 0, depenses: 0, categories: {} };
    transactions.forEach((t) => {
      if (t.date.startsWith(currentMonth) && t.type === 'DAILY_OP') {
        stats.recettes += (t.recette || 0);
        if (t.depense > 0) {
          stats.depenses += t.depense;
          const cat = t.category || 'Autre';
          stats.categories[cat] = (stats.categories[cat] || 0) + t.depense;
        }
      }
    });
    return stats;
  }, [transactions, currentMonth]);

  const filteredTransactions = useMemo(() => [...transactions].filter(t => t.date.startsWith(currentMonth)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id)), [transactions, currentMonth]);

  const clientStats = useMemo(() => {
    const stats = {};
    orders.forEach(o => {
      const name = o.client.trim().toUpperCase();
      if (!stats[name]) stats[name] = { name: o.client, totalCmd: 0, totalPaid: 0, debt: 0, count: 0 };
      stats[name].totalCmd += o.total;
      stats[name].totalPaid += o.avance;
      stats[name].debt += Math.max(0, o.total - o.avance);
      stats[name].count += 1;
    });
    return Object.values(stats).sort((a, b) => b.debt - a.debt);
  }, [orders]);

  const stockAlertsCount = useMemo(() => inventory.filter(i => i.qty <= i.threshold).length, [inventory]);

  const powerStats = useMemo(() => {
    let totalAmt = 0;
    let totalKwh = 0;
    recharges.forEach(r => {
      if (r.date.startsWith(currentMonth)) {
        totalAmt += r.amount;
        totalKwh += (r.kwh || 0);
      }
    });
    return { totalAmt, totalKwh };
  }, [recharges, currentMonth]);


  // --- ACTIONS FINANCES ---
  const handleAddDailyOp = (e) => {
    e.preventDefault();
    const r = parseFloat(opRecette) || 0;
    const d = parseFloat(opDepense) || 0;
    if (r === 0 && d === 0) return showAlert('Veuillez saisir un montant valide.', 'error');
    
    setTransactions([...transactions, createTransaction(r, d, opDesc || 'Mouvement de caisse', opDate, opCategory)]);
    setOpRecette(''); setOpDepense(''); setOpDesc(''); setOpCategory('Autre');
    showAlert('Opération enregistrée avec succès.', 'success');
  };

  const handleRepartition = () => {
    if (caisseBalance <= 0) return showAlert("Caisse vide.", 'error');
    setTransactions([...transactions, { id: Date.now().toString(), type: 'REPARTITION', date: new Date().toISOString().split('T')[0], amount: caisseBalance, description: 'Répartition automatique' }]);
    showAlert(`Répartition effectuée.`, 'success');
  };

  const handleDebit = (e) => {
    e.preventDefault();
    const amt = parseFloat(debAmount);
    if (!amt || amt <= 0) return showAlert('Montant invalide.', 'error');
    if (accountBalances[debAccount] < amt) return showAlert("Fonds insuffisants !", 'error');
    setTransactions([...transactions, { id: Date.now().toString(), type: 'DEBIT', date: debDate, account: debAccount, amount: amt, description: debDesc }]);
    setDebAmount(''); setDebDesc('');
    showAlert('Débit effectué.', 'success');
  };

  const deleteTransaction = (id) => setTransactions(transactions.filter(t => t.id !== id));

  // --- ACTIONS COMMANDES ---
  const handleAddOrder = (e) => {
    e.preventDefault();
    const total = parseFloat(cmdTotal) || 0;
    const avance = parseFloat(cmdAvance) || 0;
    if (!cmdClient || total <= 0) return showAlert('Le client et le total sont obligatoires.', 'error');

    const newOrder = { id: Date.now().toString(), date: cmdDate, client: cmdClient, description: cmdDesc, total, avance, status: 'ATTENTE' };
    let newTransactions = [...transactions];
    if (avance > 0) {
      newTransactions.push(createTransaction(avance, 0, `Avance Cmd : ${cmdClient} (${cmdDesc})`, cmdDate, 'Vente'));
      showAlert(`Commande créée et avance ajoutée en caisse !`, 'success');
    } else showAlert('Commande créée avec succès.', 'success');

    setOrders([newOrder, ...orders]); setTransactions(newTransactions); setShowOrderModal(false);
    setCmdClient(''); setCmdDesc(''); setCmdTotal(''); setCmdAvance('');
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return showAlert('Montant invalide', 'error');

    const reliquat = paymentOrder.total - paymentOrder.avance;
    if (amt > reliquat) return showAlert(`Le paiement dépasse le reste à payer (${formatCurrency(reliquat)}).`, 'error');

    const updatedOrders = orders.map(o => {
      if (o.id === paymentOrder.id) return { ...o, avance: o.avance + amt };
      return o;
    });

    setOrders(updatedOrders);
    setTransactions([...transactions, createTransaction(amt, 0, `Paiement Cmd : ${paymentOrder.client}`, new Date().toISOString().split('T')[0], 'Vente')]);
    setShowPaymentModal(false); setPaymentAmount(''); setPaymentOrder(null);
    showAlert('Paiement ajouté et encaissé avec succès.', 'success');
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const deleteOrder = (id) => {
    if(window.confirm("Supprimer cette commande ? (Les montants déjà encaissés resteront dans la caisse)")) setOrders(orders.filter(o => o.id !== id));
  };

  const printReceipt = (order) => {
    const reliquat = Math.max(0, order.total - order.avance);
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Reçu - ${order.client}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; width: 300px; margin: auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="center border-b">
            <h2 style="margin:0;">NUMERIMA IMPRIM</h2>
            <p style="margin:5px 0 0 0; font-size:12px;">Tél: XXXXXXXX</p>
          </div>
          <div class="border-b" style="font-size:14px;">
            <p>Date: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
            <p>Ticket N°: ${order.id.substring(0, 6)}</p>
            <p>Client: <span class="bold">${order.client}</span></p>
          </div>
          <div class="border-b">
            <p class="bold" style="margin-bottom:5px;">Désignation:</p>
            <p style="margin-top:0;">${order.description || 'Travaux d\'impression'}</p>
          </div>
          <div class="border-b">
            <div class="row"><span class="bold">TOTAL TTC</span><span class="bold">${new Intl.NumberFormat('fr-FR').format(order.total)} F</span></div>
            <div class="row"><span>Avance payée</span><span>${new Intl.NumberFormat('fr-FR').format(order.avance)} F</span></div>
          </div>
          <div>
            <div class="row" style="font-size:18px;"><span class="bold">RESTE A PAYER</span><span class="bold">${new Intl.NumberFormat('fr-FR').format(reliquat)} F</span></div>
          </div>
          <div class="center" style="margin-top:30px; font-size:12px;">
            <p>Merci de votre confiance !</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleWhatsApp = (order) => {
    const reliquat = Math.max(0, order.total - order.avance);
    let text = `Bonjour ${order.client},\n\nConcernant votre commande chez *Numerima Imprim* :\n📄 ${order.description || 'Travaux d\'impression'}\n\n`;
    text += `💰 *Total :* ${formatCurrency(order.total)}\n`;
    if (order.avance > 0) text += `✅ *Avance payée :* ${formatCurrency(order.avance)}\n`;
    if (reliquat > 0) text += `⚠️ *Reste à payer :* ${formatCurrency(reliquat)}\n\n`;
    
    if (order.status === 'TERMINE') text += `🎉 *Votre commande est PRÊTE !* Vous pouvez passer la récupérer.\n`;
    else text += `⏳ Votre commande est actuellement *${order.status === 'EN_COURS' ? 'en cours de traitement' : 'en attente'}*.\n`;
    
    text += `\nMerci de votre confiance !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- ACTIONS STOCK ---
  const handleAddStock = (e) => {
    e.preventDefault();
    if(!stockName) return;
    setInventory([...inventory, { id: Date.now().toString(), name: stockName, qty: parseFloat(stockQty) || 0, unit: stockUnit, threshold: parseFloat(stockThreshold) || 5 }]);
    setShowStockModal(false); setStockName(''); setStockQty(''); setStockThreshold('10');
  };
  const updateStockQty = (id, amount) => setInventory(inventory.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + amount) } : item));
  const deleteStockItem = (id) => {
    if(window.confirm("Supprimer cet article du stock ?")) setInventory(inventory.filter(i => i.id !== id));
  };

  // --- ACTIONS DEVIS ---
  const handleAddQuoteItem = () => setQuoteItems([...quoteItems, { id: Date.now(), desc: '', qty: 1, price: 0 }]);
  const handleRemoveQuoteItem = (id) => { if (quoteItems.length > 1) setQuoteItems(quoteItems.filter(item => item.id !== id)); };
  const updateQuoteItem = (id, field, value) => setQuoteItems(quoteItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  const handleAddQuote = (e) => {
    e.preventDefault();
    if (!quoteClient) return showAlert('Le nom du client est obligatoire.', 'error');
    const total = quoteItems.reduce((acc, item) => acc + (parseFloat(item.qty) * parseFloat(item.price || 0)), 0);
    setQuotes([{ id: Date.now().toString(), date: quoteDate, client: quoteClient, items: quoteItems, total }, ...quotes]);
    setShowQuoteModal(false); setQuoteClient(''); setQuoteItems([{ id: Date.now(), desc: '', qty: 1, price: 0 }]);
  };
  const deleteQuote = (id) => {
    if (window.confirm("Supprimer ce devis ?")) setQuotes(quotes.filter(q => q.id !== id));
  };
  const printQuote = (quote) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Devis - ${quote.client}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #4f46e5; margin: 0; }
            .meta { margin-bottom: 30px; }
            .meta p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; color: #333; }
            .total { text-align: right; font-size: 1.2em; font-weight: bold; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Numerima Imprim</h1>
            <p>DEVIS / ESTIMATION</p>
          </div>
          <div class="meta">
            <p><strong>Date :</strong> ${new Date(quote.date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Client :</strong> ${quote.client}</p>
            <p><strong>N° Devis :</strong> DEV-${quote.id.substring(0, 6).toUpperCase()}</p>
          </div>
          <table>
            <thead><tr><th>Description</th><th>Quantité</th><th>Prix Unitaire</th><th>Total</th></tr></thead>
            <tbody>
              ${quote.items.map(item => `<tr><td>${item.desc}</td><td>${item.qty}</td><td>${new Intl.NumberFormat('fr-FR').format(item.price || 0)} FCFA</td><td>${new Intl.NumberFormat('fr-FR').format((item.qty * (item.price || 0)))} FCFA</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="total"><p>Total TTC : ${new Intl.NumberFormat('fr-FR').format(quote.total)} FCFA</p></div>
          <div style="margin-top: 50px; font-size: 0.9em; color: #666; text-align: center;"><p>Ce devis est valable 30 jours.</p></div>
        </body>
      </html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // --- ACTIONS ÉNERGIE ---
  const handleAddRecharge = (e) => {
    e.preventDefault();
    const amt = parseFloat(powAmount) || 0;
    const newRecharge = { id: Date.now().toString(), date: powDate, amount: amt, kwh: parseFloat(powKwh) || 0, desc: powDesc };
    setRecharges([newRecharge, ...recharges]);
    setTransactions([...transactions, createTransaction(0, amt, `Électricité: ${powDesc}`, powDate, 'Autre')]);
    setShowPowerModal(false); setPowAmount(''); setPowKwh('');
  };
  const deleteRecharge = (id) => {
    if(window.confirm("Supprimer l'historique de cette recharge ?")) setRecharges(recharges.filter(r => r.id !== id));
  };

  // ==========================================
  // ÉCRAN DE CONNEXION
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Lock className="w-8 h-8 text-white" /></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Numerima Imprim</h1>
            <p className="text-indigo-200 mt-2 text-sm">Entrez votre code d'accès</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><KeyRound className="h-5 w-5 text-slate-400" /></div>
                  <input type="password" pattern="[0-9]*" inputMode="numeric" value={pinCode} onChange={(e) => setPinCode(e.target.value)}
                    className={`block w-full pl-12 pr-4 py-4 text-center text-2xl tracking-[0.5em] font-bold rounded-xl border-2 focus:ring-0 transition-colors ${pinError ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 bg-slate-50 focus:border-indigo-500'}`} placeholder="••••" autoFocus />
                </div>
                {pinError && <p className="text-red-500 text-sm text-center mt-2 font-medium">Code PIN incorrect</p>}
                <p className="text-xs text-slate-400 text-center mt-4">Admin: 1234 | Employé: 0000</p>
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 shadow-lg">Déverrouiller</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD PRINCIPAL
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 animate-fade-in">
      
      {/* --- TOUS LES MODALS (FENÊTRES POP-UP) RESTAURÉS --- */}
      
      {/* ALERTE TOAST */}
      {alertInfo.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${alertInfo.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {alertInfo.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-medium">{alertInfo.message}</span>
            <button onClick={() => setAlertInfo({ show: false, message: '', type: 'error' })} className="ml-4 opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* MODAL SETTINGS CLOUD */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600" /> Paramètres Cloud</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Google Apps Script</label>
                <input type="text" value={syncUrl} onChange={(e) => { setSyncUrl(e.target.value); localStorage.setItem('finance_print_sync_url', e.target.value); }} className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 text-sm" />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAIEMENT PARTIEL */}
      {showPaymentModal && paymentOrder && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2"><DollarSign className="w-5 h-5" /> Ajouter un Paiement</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 mb-2">Reste à payer : <strong className="text-rose-600">{formatCurrency(paymentOrder.total - paymentOrder.avance)}</strong></p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant encaissé</label>
                <input type="number" required min="1" max={paymentOrder.total - paymentOrder.avance} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-emerald-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg">Encaisser</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT COMMANDE */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Printer className="w-5 h-5 text-indigo-600" /> Nouvelle Commande</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddOrder} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={cmdDate} onChange={e => setCmdDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom du Client *</label><input type="text" required placeholder="Ex: Entreprise XYZ" value={cmdClient} onChange={e => setCmdClient(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Travail à faire</label><input type="text" placeholder="Ex: 500 Cartes" value={cmdDesc} onChange={e => setCmdDesc(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Total *</label><input type="number" required min="1" value={cmdTotal} onChange={e => setCmdTotal(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Avance payée</label><input type="number" min="0" value={cmdAvance} onChange={e => setCmdAvance(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowOrderModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT STOCK */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-teal-50">
              <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2"><Package className="w-5 h-5 text-teal-600" /> Nouvel Article</h3>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'article *</label><input type="text" required value={stockName} onChange={e => setStockName(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantité Initiale</label><input type="number" min="0" required value={stockQty} onChange={e => setStockQty(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                  <select value={stockUnit} onChange={e => setStockUnit(e.target.value)} className="w-full rounded-lg border-slate-300">
                    <option value="Rames">Rames</option><option value="Cartouches">Cartouches</option><option value="Bobines">Bobines</option><option value="Unités">Unités</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Seuil d'alerte (Rupture)</label><input type="number" min="0" required value={stockThreshold} onChange={e => setStockThreshold(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowStockModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-teal-600 text-white rounded-lg">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT DEVIS */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-blue-50">
              <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Créer un Devis</h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddQuote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom du Client *</label><input type="text" required value={quoteClient} onChange={e => setQuoteClient(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Lignes du devis</label>
                {quoteItems.map((item) => (
                  <div key={item.id} className="flex gap-2 mb-2 items-start">
                    <input type="text" required placeholder="Description" value={item.desc} onChange={e => updateQuoteItem(item.id, 'desc', e.target.value)} className="flex-1 rounded-lg border-slate-300 text-sm" />
                    <input type="number" required min="1" placeholder="Qté" value={item.qty} onChange={e => updateQuoteItem(item.id, 'qty', e.target.value)} className="w-20 rounded-lg border-slate-300 text-sm" />
                    <input type="number" required min="0" placeholder="Prix U." value={item.price} onChange={e => updateQuoteItem(item.id, 'price', e.target.value)} className="w-28 rounded-lg border-slate-300 text-sm" />
                    <button type="button" onClick={() => handleRemoveQuoteItem(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mt-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={handleAddQuoteItem} className="text-sm text-indigo-600 font-medium flex items-center gap-1 mt-2"><Plus className="w-4 h-4" /> Ajouter une ligne</button>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-right font-bold text-lg border border-slate-200 mt-4">
                Total : {formatCurrency(quoteItems.reduce((acc, item) => acc + (parseFloat(item.qty || 0) * parseFloat(item.price || 0)), 0))}
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowQuoteModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Enregistrer le Devis</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECHARGE ELECTRICITÉ */}
      {showPowerModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-yellow-50">
              <h3 className="text-lg font-bold text-yellow-900 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-600" /> Acheter Électricité</h3>
              <button onClick={() => setShowPowerModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddRecharge} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date d'achat</label><input type="date" required value={powDate} onChange={e => setPowDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Montant Payé *</label><input type="number" required min="1" value={powAmount} onChange={e => setPowAmount(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-yellow-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nb de kWh</label><input type="number" step="0.1" min="0" value={powKwh} onChange={e => setPowKwh(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-yellow-500" /></div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowPowerModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-yellow-500 text-white rounded-lg">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* HEADER & NAV */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <PieChart className="w-8 h-8 flex-shrink-0" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Numerima Imprim <span className="text-xs text-slate-400 ml-2 font-normal uppercase bg-slate-100 px-2 py-1 rounded-full">{userRole}</span></h1>
            <h1 className="text-xl font-bold tracking-tight sm:hidden">Numerima</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-md transition-colors" title="Déconnexion"><Lock className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto bg-white border-b border-slate-100">
          <div className="flex overflow-x-auto hide-scrollbar px-4 sm:px-6 lg:px-8">
            {userRole === 'admin' && (
              <button onClick={() => setActiveTab('finances')} className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'finances' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}><Wallet className="w-4 h-4" /> Finances</button>
            )}
            <button onClick={() => setActiveTab('commandes')} className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'commandes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}><ClipboardList className="w-4 h-4" /> Commandes</button>
            <button onClick={() => setActiveTab('devis')} className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'devis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}><FileText className="w-4 h-4" /> Devis</button>
            <button onClick={() => setActiveTab('clients')} className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}><Users className="w-4 h-4" /> Clients</button>
            <button onClick={() => setActiveTab('stock')} className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'stock' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
              <Package className="w-4 h-4" /> Stock {stockAlertsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stockAlertsCount}</span>}
            </button>
            <button onClick={() => setActiveTab('energie')} className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'energie' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-slate-500'}`}>
              <Zap className="w-4 h-4" /> Électricité
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ========================================= */}
        {/* VUE 1 : FINANCES (ADMIN UNIQUEMENT) */}
        {/* ========================================= */}
        {activeTab === 'finances' && userRole === 'admin' && (
          <div className="animate-fade-in space-y-8">
            
            {/* STATS (RESTAURÉES AVEC LES 3 CARTES + LE GRAPHIQUE) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Caisse Disponible</p>
                <h2 className="text-4xl font-extrabold text-slate-800 mt-2">{formatCurrency(caisseBalance)}</h2>
                <button onClick={handleRepartition} className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">Répartir ({formatCurrency(caisseBalance)})</button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                 <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recettes du mois</p>
                    <h2 className="text-3xl font-bold text-emerald-600 mt-2">+{formatCurrency(monthlyStats.recettes)}</h2>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500"><ArrowUpRight className="w-6 h-6" /></div>
                </div>
                <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
                  <Filter className="w-4 h-4 mr-1" />
                  <input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0 text-slate-700 cursor-pointer h-5"/>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                 <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dépenses du mois</p>
                    <h2 className="text-3xl font-bold text-rose-600 mt-2">-{formatCurrency(monthlyStats.depenses)}</h2>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl text-rose-500"><ArrowDownRight className="w-6 h-6" /></div>
                </div>
                <div className="mt-4 text-sm font-medium text-slate-500">
                  Bénéfice : <span className={(monthlyStats.recettes - monthlyStats.depenses) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatCurrency(monthlyStats.recettes - monthlyStats.depenses)}
                  </span>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* COLONNE GAUCHE: FORMULAIRES */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Form 1 : Opération Quotidienne */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">1</div>Opération Quotidienne</h3>
                  <form onSubmit={handleAddDailyOp} className="space-y-4">
                    <input type="date" required value={opDate} onChange={e => setOpDate(e.target.value)} className="w-full rounded-lg border-slate-300" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" min="0" placeholder="Recette (+)" value={opRecette} onChange={e => setOpRecette(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-emerald-500" />
                      <input type="number" min="0" placeholder="Dépense (-)" value={opDepense} onChange={e => setOpDepense(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-rose-500" />
                    </div>
                    <input type="text" placeholder="Description..." value={opDesc} onChange={e => setOpDesc(e.target.value)} className="w-full rounded-lg border-slate-300" />
                    
                    {parseFloat(opDepense) > 0 && (
                      <select value={opCategory} onChange={e => setOpCategory(e.target.value)} className="w-full rounded-lg border-slate-300 text-sm text-slate-600">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    
                    <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-900 transition-colors">Enregistrer</button>
                  </form>
                </div>

                {/* Form 2 : Débit d'un Compte */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">2</div>Retrait d'un Compte</h3>
                  <form onSubmit={handleDebit} className="space-y-4">
                    <input type="date" required value={debDate} onChange={e => setDebDate(e.target.value)} className="w-full rounded-lg border-slate-300" />
                    <select value={debAccount} onChange={e => setDebAccount(e.target.value)} className="w-full rounded-lg border-slate-300 text-sm">
                      {ACCOUNTS_CONFIG.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (Solde: {formatCurrency(accountBalances[acc.id])})</option>)}
                    </select>
                    <input type="number" step="0.01" min="1" required placeholder="Montant à retirer" value={debAmount} onChange={e => setDebAmount(e.target.value)} className="w-full rounded-lg border-slate-300" />
                    <input type="text" required placeholder="Motif du retrait (ex: Achat imprimante)" value={debDesc} onChange={e => setDebDesc(e.target.value)} className="w-full rounded-lg border-slate-300" />
                    <button type="submit" className="w-full bg-white border-2 border-slate-800 text-slate-800 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors">Valider le retrait</button>
                  </form>
                </div>

              </div>

              {/* COLONNE DROITE: COMPTES & GRAPHIQUE */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* COMPTES DÉDIÉS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                   <h3 className="text-xl font-bold text-slate-800 mb-6">Comptes Dédiés (Épargne & Charges)</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ACCOUNTS_CONFIG.map((acc) => (
                        <div key={acc.id} className={`p-4 rounded-xl border ${acc.borderColor} bg-white shadow-sm flex flex-col`}>
                          <div className="flex items-center gap-2 mb-2"><div className={`w-3 h-3 rounded-full ${acc.color}`}></div><span className="text-xs font-bold text-slate-500 uppercase">{acc.parent}</span></div>
                          <h4 className={`text-sm font-semibold mb-2 ${acc.textColor}`}>{acc.name}</h4>
                          <p className="text-2xl font-bold text-slate-800">{formatCurrency(accountBalances[acc.id])}</p>
                        </div>
                      ))}
                    </div>
                </div>

                {/* GRAPHIQUE DES DÉPENSES */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dépenses par catégorie</p>
                  </div>
                  <div className="space-y-3">
                    {monthlyStats.depenses === 0 ? <p className="text-slate-400 text-sm">Aucune dépense ce mois-ci.</p> : null}
                    {Object.entries(monthlyStats.categories).sort((a,b) => b[1] - a[1]).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-32 text-xs font-medium text-slate-600 truncate">{cat}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{width: `${(amt / monthlyStats.depenses) * 100}%`}}></div>
                        </div>
                        <span className="w-24 text-right text-xs font-bold text-rose-600">{formatCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
            
            {/* HISTORIQUE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-slate-500" />Historique des Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 text-right">Montant</th><th className="px-6 py-4 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Aucune transaction ce mois.</td></tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-600">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                          <td className="px-6 py-4">
                            {t.type === 'DAILY_OP' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">Caisse</span>}
                            {t.type === 'REPARTITION' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">Répartition</span>}
                            {t.type === 'DEBIT' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-medium">Débit</span>}
                          </td>
                          <td className="px-6 py-4"><p className="text-slate-800 font-medium truncate max-w-[200px]">{t.description}</p></td>
                          <td className="px-6 py-4 text-right font-medium">
                            {t.type === 'DAILY_OP' && <div className="flex flex-col items-end">{(t.recette || 0) > 0 && <span className="text-emerald-600">+{formatCurrency(t.recette)}</span>}{(t.depense || 0) > 0 && <span className="text-rose-600">-{formatCurrency(t.depense)}</span>}</div>}
                            {t.type === 'REPARTITION' && <span className="text-indigo-600">{formatCurrency(t.amount)}</span>}
                            {t.type === 'DEBIT' && <span className="text-orange-600">-{formatCurrency(t.amount)}</span>}
                          </td>
                          <td className="px-6 py-4 text-center"><button onClick={() => deleteTransaction(t.id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4 mx-auto" /></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}

        {/* ========================================= */}
        {/* VUE 2 : COMMANDES */}
        {/* ========================================= */}
        {activeTab === 'commandes' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Commandes en cours</h2>
              <button onClick={() => { setCmdDate(new Date().toISOString().split('T')[0]); setShowOrderModal(true)}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Nouveau Ticket</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order) => {
                const reliquat = Math.max(0, order.total - order.avance);
                return (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4" /><span className="font-bold text-slate-800">{order.client}</span></div>
                      {order.status === 'ATTENTE' && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">Attente</span>}
                      {order.status === 'EN_COURS' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">En cours</span>}
                      {order.status === 'TERMINE' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">Terminé</span>}
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-4 h-10 overflow-hidden line-clamp-2">{order.description}</p>
                    
                    <div className="bg-slate-50 p-3 rounded-xl mb-4 text-sm">
                      <div className="flex justify-between mb-1"><span className="text-slate-500">Total:</span><strong className="text-slate-800">{formatCurrency(order.total)}</strong></div>
                      <div className="flex justify-between mb-1"><span className="text-slate-500">Avance payée:</span><span className="text-emerald-600 font-medium">{formatCurrency(order.avance)}</span></div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                        <span className="text-slate-700">Reste à payer:</span>
                        <span className={reliquat > 0 ? "text-rose-600" : "text-emerald-600"}>{formatCurrency(reliquat)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {order.status === 'ATTENTE' && <button onClick={() => updateOrderStatus(order.id, 'EN_COURS')} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-semibold">Lancer</button>}
                        {order.status === 'EN_COURS' && <button onClick={() => updateOrderStatus(order.id, 'TERMINE')} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-semibold">Terminer</button>}
                        {order.status === 'TERMINE' && reliquat === 0 && <button disabled className="flex-1 bg-slate-100 text-slate-400 py-2 rounded-lg text-sm font-semibold">Soldé</button>}
                        
                        {reliquat > 0 && (
                          <button onClick={() => { setPaymentOrder(order); setShowPaymentModal(true); }} className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-semibold border border-indigo-200">
                            Paiement
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 border-t border-slate-100 pt-2 mt-1">
                        <button onClick={() => printReceipt(order)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                          <Receipt className="w-4 h-4" /> Reçu
                        </button>
                        <button onClick={() => handleWhatsApp(order)} className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </button>
                        
                        {userRole === 'admin' && (
                          <button onClick={() => deleteOrder(order.id)} className="px-3 py-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* VUE 3 : CLIENTS */}
        {/* ========================================= */}
        {activeTab === 'clients' && (
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4 font-semibold">Client</th>
                   <th className="px-6 py-4 font-semibold text-center">Commandes</th>
                   <th className="px-6 py-4 font-semibold text-right">Reste à Payer</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {clientStats.map((client, idx) => (
                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4 font-bold text-slate-800">{client.name}</td>
                     <td className="px-6 py-4 text-center">{client.count}</td>
                     <td className="px-6 py-4 text-right">
                       {client.debt > 0 ? <span className="text-rose-600 font-bold">{formatCurrency(client.debt)}</span> : <span className="text-emerald-500 font-medium">À jour</span>}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
        )}

        {/* ========================================= */}
        {/* VUE 4 : DEVIS */}
        {/* ========================================= */}
        {activeTab === 'devis' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Devis & Estimations</h2>
              </div>
              <button onClick={() => setShowQuoteModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Nouveau Devis</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <div key={quote.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4" /><span className="font-bold text-slate-800">{quote.client}</span></div>
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">DEV-{quote.id.substring(0, 6).toUpperCase()}</span>
                  </div>
                  
                  <div className="text-sm text-slate-500 mb-4 flex-1">
                    <p className="mb-2"><Clock className="w-3 h-3 inline mr-1"/> {new Date(quote.date).toLocaleDateString('fr-FR')}</p>
                    <p className="font-medium text-slate-700">{quote.items.length} article(s)</p>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-xl mb-4 text-center">
                    <span className="text-slate-500 text-sm">Total TTC</span>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(quote.total)}</p>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => printQuote(quote)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                      <Download className="w-4 h-4"/> PDF / Imprimer
                    </button>
                    {userRole === 'admin' && (
                      <button onClick={() => deleteQuote(quote.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* VUE 5 : STOCK (INVENTAIRE) */}
        {/* ========================================= */}
        {activeTab === 'stock' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Gestion des Stocks</h2>
                {stockAlertsCount > 0 && <p className="text-rose-600 text-sm font-medium flex items-center gap-1 mt-1"><AlertTriangle className="w-4 h-4"/> {stockAlertsCount} article(s) en rupture.</p>}
              </div>
              <button onClick={() => setShowStockModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Nouvel Article</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inventory.map((item) => {
                const isLow = item.qty <= item.threshold;
                return (
                  <div key={item.id} className={`bg-white border rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all ${isLow ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200 hover:shadow-md'}`}>
                    {isLow && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Stock Critique</div>}
                    
                    <h4 className="font-bold text-slate-800 mb-1 mt-2 pr-12 line-clamp-2" title={item.name}>{item.name}</h4>
                    <p className="text-xs text-slate-400 mb-4">Seuil d'alerte : {item.threshold}</p>
                    
                    <div className={`p-4 rounded-xl flex items-center justify-between mb-4 ${isLow ? 'bg-rose-50' : 'bg-teal-50'}`}>
                      <span className="text-sm font-medium text-slate-500">Quantité</span>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${isLow ? 'text-rose-600' : 'text-teal-700'}`}>{item.qty}</span>
                        <span className={`text-xs ml-1 font-bold ${isLow ? 'text-rose-400' : 'text-teal-500'}`}>{item.unit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => updateStockQty(item.id, -1)} disabled={item.qty <= 0} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg flex justify-center disabled:opacity-50"><Minus className="w-5 h-5"/></button>
                      <button onClick={() => updateStockQty(item.id, 1)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg flex justify-center"><Plus className="w-5 h-5"/></button>
                      {userRole === 'admin' && <button onClick={() => deleteStockItem(item.id)} className="px-3 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* VUE 6 : ÉLECTRICITÉ */}
        {/* ========================================= */}
        {activeTab === 'energie' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Zap className="w-6 h-6 text-yellow-500" /> Électricité</h2>
                <div className="mt-2 flex items-center text-sm font-medium text-slate-500">
                  <Filter className="w-4 h-4 mr-1" />
                  Mois : <input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-bold ml-2 cursor-pointer h-5"/>
                </div>
              </div>
              <button onClick={() => setShowPowerModal(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Recharger</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dépenses (Mois)</p>
                  <h2 className="text-4xl font-extrabold text-slate-800 mt-2">{formatCurrency(powerStats.totalAmt)}</h2>
                </div>
                <div className="p-4 bg-yellow-50 rounded-2xl text-yellow-500"><Wallet className="w-8 h-8" /></div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Volume (Mois)</p>
                  <h2 className="text-4xl font-extrabold text-slate-800 mt-2">{powerStats.totalKwh.toFixed(1)} <span className="text-xl text-slate-500 font-medium">kWh</span></h2>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-500"><Zap className="w-8 h-8" /></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-slate-500" /> Historique</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 text-right">Volume</th><th className="px-6 py-4 text-right">Montant</th>{userRole === 'admin' && <th className="px-6 py-4 text-center">Action</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recharges.filter(r => r.date.startsWith(currentMonth)).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4">{r.desc}</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-600">{r.kwh > 0 ? `${r.kwh} kWh` : '-'}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(r.amount)}</td>
                        {userRole === 'admin' && (
                          <td className="px-6 py-4 text-center"><button onClick={() => deleteRecharge(r.id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4 mx-auto" /></button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
