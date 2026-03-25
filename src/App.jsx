import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, ArrowDownRight, ArrowUpRight, PieChart, 
  History, AlertCircle, CheckCircle2, X, Filter,
  Settings, RefreshCw, Cloud, Lock, KeyRound,
  ClipboardList, PlusCircle, Clock, PlayCircle, CheckCircle, User, Printer,
  Users, Package, AlertTriangle, Plus, Minus, Trash2, FileText, Download
} from 'lucide-react';

// --- CONFIGURATION DES COMPTES ET POURCENTAGES ---
const ACCOUNTS_CONFIG = [
  { id: 'fr_volatile', name: 'FR Volatile', parent: 'Fonctionnement (45%)', displayPercent: '80%', percent: 0.36, color: 'bg-blue-500', textColor: 'text-blue-600', borderColor: 'border-blue-200' },
  { id: 'fr_immobilise', name: 'FR Immobilisé', parent: 'Fonctionnement (45%)', displayPercent: '20%', percent: 0.09, color: 'bg-indigo-500', textColor: 'text-indigo-600', borderColor: 'border-indigo-200' },
  { id: 'epargne_inv', name: 'Épargne Investissement', parent: 'Épargnes (20%)', displayPercent: '60%', percent: 0.12, color: 'bg-emerald-500', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
  { id: 'epargne_imm', name: 'Épargne Immobilisée', parent: 'Épargnes (20%)', displayPercent: '40%', percent: 0.08, color: 'bg-teal-500', textColor: 'text-teal-600', borderColor: 'border-teal-200' },
  { id: 'charges_fixes', name: 'Charges Fixes', parent: 'Charges Fixes (35%)', displayPercent: '', percent: 0.35, color: 'bg-rose-500', textColor: 'text-rose-600', borderColor: 'border-rose-200' },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';
};

export default function App() {
  // --- ÉTATS DE NAVIGATION ---
  const [activeTab, setActiveTab] = useState('finances'); // 'finances', 'commandes', 'clients', 'stock'

  // --- ÉTATS DE SÉCURITÉ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState(false);
  const CORRECT_PIN = "0125"; // 🔒 VOTRE CODE PIN ICI

  // --- ÉTATS FINANCIERS ---
  const [transactions, setTransactions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', type: 'error' });

  // Formulaires Finances
  const [opDate, setOpDate] = useState(new Date().toISOString().split('T')[0]);
  const [opRecette, setOpRecette] = useState('');
  const [opDepense, setOpDepense] = useState('');
  const [opDesc, setOpDesc] = useState('');
  const [debDate, setDebDate] = useState(new Date().toISOString().split('T')[0]);
  const [debAccount, setDebAccount] = useState('fr_volatile');
  const [debAmount, setDebAmount] = useState('');
  const [debDesc, setDebDesc] = useState('');

  // --- ÉTATS COMMANDES ---
  const [orders, setOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [cmdClient, setCmdClient] = useState('');
  const [cmdDesc, setCmdDesc] = useState('');
  const [cmdTotal, setCmdTotal] = useState('');
  const [cmdAvance, setCmdAvance] = useState('');
  const [cmdDate, setCmdDate] = useState(new Date().toISOString().split('T')[0]);

  // --- ÉTATS STOCK ---
  const [inventory, setInventory] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockName, setStockName] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockUnit, setStockUnit] = useState('Rames');
  const [stockThreshold, setStockThreshold] = useState('10');

  // --- ÉTATS DEVIS ---
  const [quotes, setQuotes] = useState([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteClient, setQuoteClient] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [quoteItems, setQuoteItems] = useState([{ id: Date.now(), desc: '', qty: 1, price: 0 }]);

  // --- ÉTATS CLOUD SYNC ---
  const [showSettings, setShowSettings] = useState(false);
  const defaultSyncUrl = 'https://script.google.com/macros/s/AKfycbxfTye97lUS8bBS90zM8ERD4A6CgCtMlvcrAzTIJb2lOYF4jROADPk8XoHw7E52Yb0fNA/exec';
  const [syncUrl, setSyncUrl] = useState(defaultSyncUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // --- VÉRIFICATION DE SESSION ---
  useEffect(() => {
    if (sessionStorage.getItem('imprim_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // --- CHARGEMENT INITIAL (Local ou Cloud) ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const savedUrl = localStorage.getItem('finance_print_sync_url');
    if (savedUrl) setSyncUrl(savedUrl);

    // Charger les modules locaux
    try {
      const savedOrders = localStorage.getItem('finance_print_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      
      const savedStock = localStorage.getItem('finance_print_inventory');
      if (savedStock) setInventory(JSON.parse(savedStock));

      const savedQuotes = localStorage.getItem('finance_print_quotes');
      if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
    } catch(e) { console.error("Erreur de lecture locale", e); }

    const loadData = async () => {
      setIsSyncing(true);
      const urlToUse = savedUrl || defaultSyncUrl;
      if (urlToUse) {
        try {
          const res = await fetch(urlToUse);
          const data = await res.json();
          if (Array.isArray(data)) setTransactions(data);
        } catch (error) {
          showAlert('Erreur de connexion à Google Sheets, chargement local...', 'error');
          loadLocalTransactions();
        }
      } else {
        loadLocalTransactions();
      }
      setIsSyncing(false);
      setInitialLoadDone(true);
    };

    const loadLocalTransactions = () => {
      const saved = localStorage.getItem('finance_print_data');
      if (saved) {
        try { setTransactions(JSON.parse(saved)); } catch (e) { console.error(e); }
      }
    };

    loadData();
  }, [isAuthenticated]);

  // --- SAUVEGARDE AUTOMATIQUE ---
  useEffect(() => {
    if (!initialLoadDone || !isAuthenticated) return;
    
    // Sauvegarde locale complète
    localStorage.setItem('finance_print_data', JSON.stringify(transactions));
    localStorage.setItem('finance_print_orders', JSON.stringify(orders));
    localStorage.setItem('finance_print_inventory', JSON.stringify(inventory));
    localStorage.setItem('finance_print_quotes', JSON.stringify(quotes));
    
    // Sauvegarde Cloud (Finances)
    if (syncUrl) {
      const syncData = async () => {
        setIsSyncing(true);
        try {
          await fetch(syncUrl, {
            method: 'POST',
            body: JSON.stringify(transactions),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        } catch (error) {
          console.error(error);
        } finally {
          setIsSyncing(false);
        }
      };
      const timeoutId = setTimeout(() => syncData(), 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [transactions, orders, inventory, quotes, syncUrl, initialLoadDone, isAuthenticated]);

  // --- HANDLERS D'AUTHENTIFICATION ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (pinCode === CORRECT_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      sessionStorage.setItem('imprim_auth', 'true');
    } else {
      setPinError(true);
      setPinCode('');
      setTimeout(() => setPinError(false), 3000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('imprim_auth');
    setPinCode('');
  };

  // --- CALCULS STATISTIQUES ---
  const showAlert = (message, type = 'error') => {
    setAlertInfo({ show: true, message, type });
    setTimeout(() => setAlertInfo({ show: false, message: '', type: 'error' }), 5000);
  };

  const caisseBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'DAILY_OP') return acc + (t.recette || 0) - (t.depense || 0);
      if (t.type === 'REPARTITION') return acc - (t.amount || 0);
      return acc;
    }, 0);
  }, [transactions]);

  const accountBalances = useMemo(() => {
    const balances = ACCOUNTS_CONFIG.reduce((acc, conf) => ({ ...acc, [conf.id]: 0 }), {});
    transactions.forEach((t) => {
      if (t.type === 'REPARTITION' && t.amount) {
        ACCOUNTS_CONFIG.forEach(conf => {
          balances[conf.id] += t.amount * conf.percent;
        });
      } else if (t.type === 'DEBIT' && t.account && t.amount) {
        balances[t.account] -= t.amount;
      }
    });
    return balances;
  }, [transactions]);

  const monthlyStats = useMemo(() => {
    const stats = { recettes: 0, depenses: 0 };
    transactions.forEach((t) => {
      if (t.date.startsWith(currentMonth)) {
        if (t.type === 'DAILY_OP') {
          stats.recettes += (t.recette || 0);
          stats.depenses += (t.depense || 0);
        }
      }
    });
    return stats;
  }, [transactions, currentMonth]);

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => t.date.startsWith(currentMonth))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id)); 
  }, [transactions, currentMonth]);

  // CALCUL CLIENTS (Généré depuis les commandes)
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
    // Trier par dette décroissante (ceux qui doivent le plus en premier)
    return Object.values(stats).sort((a, b) => b.debt - a.debt);
  }, [orders]);

  const stockAlertsCount = useMemo(() => {
    return inventory.filter(i => i.qty <= i.threshold).length;
  }, [inventory]);

  // --- HANDLERS FINANCES ---
  const createTransaction = (recette, depense, description, date = new Date().toISOString().split('T')[0]) => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    type: 'DAILY_OP', date, recette, depense, description
  });

  const handleAddDailyOp = (e) => {
    e.preventDefault();
    const r = parseFloat(opRecette) || 0;
    const d = parseFloat(opDepense) || 0;
    if (r === 0 && d === 0) return showAlert('Veuillez saisir un montant valide.', 'error');
    if (caisseBalance + r - d < 0) return showAlert(`Action refusée : Cette dépense rendrait la caisse négative.`, 'error');

    setTransactions([...transactions, createTransaction(r, d, opDesc || 'Mouvement de caisse quotidien', opDate)]);
    setOpRecette(''); setOpDepense(''); setOpDesc('');
    showAlert('Opération enregistrée avec succès.', 'success');
  };

  const handleRepartition = () => {
    if (caisseBalance <= 0) return showAlert("Il n'y a aucun solde en caisse à répartir.", 'error');
    const newRep = { id: Date.now().toString(), type: 'REPARTITION', date: new Date().toISOString().split('T')[0], amount: caisseBalance, description: 'Répartition automatique des fonds' };
    setTransactions([...transactions, newRep]);
    showAlert(`Le solde a été réparti dans vos comptes.`, 'success');
  };

  const handleDebit = (e) => {
    e.preventDefault();
    const amt = parseFloat(debAmount);
    if (!amt || amt <= 0) return showAlert('Montant invalide.', 'error');
    if (accountBalances[debAccount] < amt) return showAlert("Fonds insuffisants dans ce compte !", 'error');

    const newDebit = { id: Date.now().toString(), type: 'DEBIT', date: debDate, account: debAccount, amount: amt, description: debDesc || 'Débit manuel' };
    setTransactions([...transactions, newDebit]);
    setDebAmount(''); setDebDesc('');
    showAlert('Débit effectué avec succès.', 'success');
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // --- HANDLERS COMMANDES ---
  const handleAddOrder = (e) => {
    e.preventDefault();
    const total = parseFloat(cmdTotal) || 0;
    const avance = parseFloat(cmdAvance) || 0;
    if (!cmdClient || total <= 0) return showAlert('Le client et le total sont obligatoires.', 'error');

    const newOrder = {
      id: Date.now().toString(), date: cmdDate, client: cmdClient, description: cmdDesc, total, avance, status: 'ATTENTE'
    };

    let newTransactions = [...transactions];
    if (avance > 0) {
      newTransactions.push(createTransaction(avance, 0, `Avance Cmd : ${cmdClient} (${cmdDesc})`, cmdDate));
      showAlert(`Commande créée et avance ajoutée en caisse !`, 'success');
    } else {
      showAlert('Commande créée avec succès.', 'success');
    }

    setOrders([newOrder, ...orders]);
    setTransactions(newTransactions);
    setShowOrderModal(false);
    setCmdClient(''); setCmdDesc(''); setCmdTotal(''); setCmdAvance('');
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        if (newStatus === 'TERMINE' && o.avance < o.total) {
          const reliquat = o.total - o.avance;
          if (window.confirm(`La commande de ${o.client} est terminée. Le reliquat est de ${formatCurrency(reliquat)}.\n\nEncaisser ce reliquat dans la caisse financière ?`)) {
            setTransactions([...transactions, createTransaction(reliquat, 0, `Reliquat Cmd : ${o.client} (${o.description})`)]);
            return { ...o, status: newStatus, avance: o.total };
          }
        }
        return { ...o, status: newStatus };
      }
      return o;
    });
    setOrders(updatedOrders);
  };

  const deleteOrder = (id) => {
    if(window.confirm("Supprimer cette commande ? (Les montants déjà encaissés resteront dans la caisse)")) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  // --- HANDLERS STOCK ---
  const handleAddStock = (e) => {
    e.preventDefault();
    if(!stockName) return;
    const newItem = {
      id: Date.now().toString(),
      name: stockName,
      qty: parseFloat(stockQty) || 0,
      unit: stockUnit,
      threshold: parseFloat(stockThreshold) || 5
    };
    setInventory([...inventory, newItem]);
    setShowStockModal(false);
    setStockName(''); setStockQty(''); setStockThreshold('10');
    showAlert('Article ajouté au stock', 'success');
  };

  const updateStockQty = (id, amount) => {
    setInventory(inventory.map(item => {
      if(item.id === id) {
        const newQty = Math.max(0, item.qty + amount);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const deleteStockItem = (id) => {
    if(window.confirm("Supprimer cet article du stock ?")) {
      setInventory(inventory.filter(i => i.id !== id));
    }
  };

  // --- HANDLERS DEVIS ---
  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { id: Date.now(), desc: '', qty: 1, price: 0 }]);
  };

  const handleRemoveQuoteItem = (id) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter(item => item.id !== id));
    }
  };

  const updateQuoteItem = (id, field, value) => {
    setQuoteItems(quoteItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddQuote = (e) => {
    e.preventDefault();
    if (!quoteClient) return showAlert('Le nom du client est obligatoire.', 'error');
    
    const total = quoteItems.reduce((acc, item) => acc + (parseFloat(item.qty) * parseFloat(item.price || 0)), 0);
    if (total <= 0) return showAlert('Le devis doit avoir un montant supérieur à 0.', 'error');

    const newQuote = {
      id: Date.now().toString(),
      date: quoteDate,
      client: quoteClient,
      items: quoteItems,
      total: total
    };

    setQuotes([newQuote, ...quotes]);
    setShowQuoteModal(false);
    setQuoteClient('');
    setQuoteItems([{ id: Date.now(), desc: '', qty: 1, price: 0 }]);
    showAlert('Devis créé avec succès.', 'success');
  };

  const deleteQuote = (id) => {
    if (window.confirm("Supprimer ce devis ?")) {
      setQuotes(quotes.filter(q => q.id !== id));
    }
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
            <h1>ImprimGestion Pro</h1>
            <p>DEVIS / ESTIMATION</p>
          </div>
          <div class="meta">
            <p><strong>Date :</strong> ${new Date(quote.date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Client :</strong> ${quote.client}</p>
            <p><strong>N° Devis :</strong> DEV-${quote.id.substring(0, 6).toUpperCase()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix Unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items.map(item => `
                <tr>
                  <td>${item.desc}</td>
                  <td>${item.qty}</td>
                  <td>${new Intl.NumberFormat('fr-FR').format(item.price || 0)} FCFA</td>
                  <td>${new Intl.NumberFormat('fr-FR').format((item.qty * (item.price || 0)))} FCFA</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Total TTC : ${new Intl.NumberFormat('fr-FR').format(quote.total)} FCFA</p>
          </div>
          <div style="margin-top: 50px; font-size: 0.9em; color: #666; text-align: center;">
            <p>Ce devis est valable 30 jours.</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ==========================================
  // ÉCRAN DE CONNEXION
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ImprimGestion Pro</h1>
            <p className="text-indigo-200 mt-2 text-sm">Espace Sécurisé</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">Entrez votre code PIN</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><KeyRound className="h-5 w-5 text-slate-400" /></div>
                  <input type="password" pattern="[0-9]*" inputMode="numeric" value={pinCode} onChange={(e) => setPinCode(e.target.value)}
                    className={`block w-full pl-12 pr-4 py-4 text-center text-2xl tracking-[0.5em] font-bold rounded-xl border-2 focus:ring-0 transition-colors ${pinError ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500' : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white'}`}
                    placeholder="••••" autoFocus />
                </div>
                {pinError && <p className="text-red-500 text-sm text-center mt-2 font-medium animate-pulse">Code PIN incorrect</p>}
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-transform active:scale-[0.98] shadow-lg shadow-slate-200">Déverrouiller</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // APPLICATION PRINCIPALE (DASHBOARD)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 animate-fade-in">
      
      {/* ALERTE MODAL/TOAST */}
      {alertInfo.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${alertInfo.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {alertInfo.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-medium">{alertInfo.message}</span>
            <button onClick={() => setAlertInfo({ show: false, message: '', type: 'error' })} className="ml-4 opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* MODAL PARAMÈTRES CLOUD */}
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
                <input type="text" value={syncUrl} onChange={(e) => { setSyncUrl(e.target.value); localStorage.setItem('finance_print_sync_url', e.target.value); }} className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
                <p className="text-xs text-slate-500 mt-2">Permet de synchroniser les finances avec Google Sheets.</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT COMMANDE */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Printer className="w-5 h-5 text-indigo-600" /> Nouvelle Commande</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddOrder} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={cmdDate} onChange={e => setCmdDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom du Client *</label><input type="text" required placeholder="Ex: Entreprise XYZ" value={cmdClient} onChange={e => setCmdClient(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Travail à faire</label><input type="text" placeholder="Ex: 500 Cartes de visite" value={cmdDesc} onChange={e => setCmdDesc(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Total *</label><input type="number" required min="1" placeholder="0" value={cmdTotal} onChange={e => setCmdTotal(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Avance</label><input type="number" min="0" placeholder="0" value={cmdAvance} onChange={e => setCmdAvance(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              </div>
              {parseFloat(cmdAvance) > 0 && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>L'avance de <strong>{formatCurrency(parseFloat(cmdAvance))}</strong> sera ajoutée à la caisse.</p>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowOrderModal(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Enregistrer</button>
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
              <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2"><Package className="w-5 h-5 text-teal-600" /> Nouvel Article Stock</h3>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'article *</label><input type="text" required placeholder="Ex: Rames Papier A4 80g" value={stockName} onChange={e => setStockName(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantité Initiale</label><input type="number" min="0" required placeholder="0" value={stockQty} onChange={e => setStockQty(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                  <select value={stockUnit} onChange={e => setStockUnit(e.target.value)} className="w-full rounded-lg border-slate-300">
                    <option value="Rames">Rames</option><option value="Cartouches">Cartouches</option>
                    <option value="Bobines">Bobines</option><option value="Unités">Unités</option>
                    <option value="Boîtes">Boîtes</option><option value="Mètres">Mètres</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seuil d'alerte (Rupture)</label>
                <input type="number" min="0" required value={stockThreshold} onChange={e => setStockThreshold(e.target.value)} className="w-full rounded-lg border-slate-300" />
                <p className="text-xs text-slate-500 mt-1">L'application vous alertera si le stock passe sous ce nombre.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowStockModal(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Ajouter au stock</button>
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
              <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddQuote} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom du Client *</label><input type="text" required placeholder="Ex: Entreprise XYZ" value={quoteClient} onChange={e => setQuoteClient(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
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
                <button type="button" onClick={handleAddQuoteItem} className="text-sm text-indigo-600 font-medium flex items-center gap-1 mt-2 hover:text-indigo-800"><Plus className="w-4 h-4" /> Ajouter une ligne</button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-right font-bold text-lg border border-slate-200 mt-4">
                Total : {formatCurrency(quoteItems.reduce((acc, item) => acc + (parseFloat(item.qty || 0) * parseFloat(item.price || 0)), 0))}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowQuoteModal(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer le Devis</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER & TOP NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <PieChart className="w-8 h-8 flex-shrink-0" />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">ImprimGestion Pro</h1>
            <h1 className="text-xl font-bold tracking-tight sm:hidden">ImprimPro</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {syncUrl && (
              <div className="hidden md:flex items-center text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                {isSyncing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin text-indigo-500" /> : <Cloud className="w-4 h-4 mr-1 text-emerald-500" />}
                {isSyncing ? 'Sync...' : 'Cloud'}
              </div>
            )}
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded-md transition-colors" title="Paramètres"><Settings className="w-5 h-5" /></button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-md transition-colors" title="Verrouiller"><Lock className="w-5 h-5" /></button>
          </div>
        </div>
        
        {/* TAB NAVIGATION SCROLLABLE POUR MOBILE */}
        <div className="max-w-7xl mx-auto bg-white border-b border-slate-100">
          <div className="flex overflow-x-auto hide-scrollbar px-4 sm:px-6 lg:px-8">
            <button onClick={() => setActiveTab('finances')} className={`py-3 px-4 sm:px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'finances' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <Wallet className="w-4 h-4" /> Finances
            </button>
            <button onClick={() => setActiveTab('commandes')} className={`py-3 px-4 sm:px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'commandes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <ClipboardList className="w-4 h-4" /> Commandes
            </button>
            <button onClick={() => setActiveTab('devis')} className={`py-3 px-4 sm:px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'devis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <FileText className="w-4 h-4" /> Devis
            </button>
            <button onClick={() => setActiveTab('clients')} className={`py-3 px-4 sm:px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <Users className="w-4 h-4" /> Clients & Créances
            </button>
            <button onClick={() => setActiveTab('stock')} className={`py-3 px-4 sm:px-6 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'stock' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <Package className="w-4 h-4" /> Stock 
              {stockAlertsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{stockAlertsCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ========================================= */}
        {/* VUE 1 : FINANCES */}
        {/* ========================================= */}
        {activeTab === 'finances' && (
          <div className="animate-fade-in space-y-8">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-50"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Caisse Disponible</p>
                    <h2 className="text-4xl font-extrabold text-slate-800 mt-2">{formatCurrency(caisseBalance)}</h2>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600"><Wallet className="w-6 h-6" /></div>
                </div>
                <div className="mt-6">
                  <button onClick={handleRepartition} disabled={caisseBalance <= 0} className={`w-full py-2.5 rounded-lg font-semibold transition-all ${caisseBalance > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    Répartir automatiquement ({formatCurrency(caisseBalance)})
                  </button>
                </div>
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
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">1</div>Opération Quotidienne</h3>
                  <form onSubmit={handleAddDailyOp} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={opDate} onChange={e => setOpDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-emerald-700 mb-1">Recette (+)</label><input type="number" step="0.01" min="0" placeholder="0" value={opRecette} onChange={e => setOpRecette(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-emerald-500" /></div>
                      <div><label className="block text-sm font-medium text-rose-700 mb-1">Dépense (-)</label><input type="number" step="0.01" min="0" placeholder="0" value={opDepense} onChange={e => setOpDepense(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-rose-500" /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Motif / Description</label><input type="text" placeholder="Ex: Vente comptoir..." value={opDesc} onChange={e => setOpDesc(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-900">Ajouter à la caisse</button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">2</div>Débit d'un Compte</h3>
                  <form onSubmit={handleDebit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" required value={debDate} onChange={e => setDebDate(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Compte à débiter</label>
                      <select value={debAccount} onChange={e => setDebAccount(e.target.value)} className="w-full rounded-lg border-slate-300">
                        {ACCOUNTS_CONFIG.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (Solde: {formatCurrency(accountBalances[acc.id])})</option>)}
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Montant (-)</label><input type="number" step="0.01" min="0" required placeholder="0" value={debAmount} onChange={e => setDebAmount(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Motif</label><input type="text" required placeholder="Ex: Achat machine..." value={debDesc} onChange={e => setDebDesc(e.target.value)} className="w-full rounded-lg border-slate-300" /></div>
                    <button type="submit" className="w-full bg-white border-2 border-slate-800 text-slate-800 py-2.5 rounded-lg font-semibold hover:bg-slate-50">Valider le retrait</button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Suivi des Comptes Dédiés</h3>
                    <div className="w-12 h-12 rounded-full shadow-inner border-4 border-white" style={{background: 'conic-gradient(#3b82f6 0% 36%, #6366f1 36% 45%, #10b981 45% 57%, #14b8a6 57% 65%, #f43f5e 65% 100%)'}}></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ACCOUNTS_CONFIG.map((acc) => (
                      <div key={acc.id} className={`p-4 rounded-xl border ${acc.borderColor} bg-white shadow-sm flex flex-col`}>
                        <div className="flex items-center gap-2 mb-2"><div className={`w-3 h-3 rounded-full ${acc.color}`}></div><span className="text-xs font-bold text-slate-500 uppercase">{acc.parent}</span></div>
                        <h4 className={`text-sm font-semibold mb-3 ${acc.textColor}`}>{acc.name} {acc.displayPercent ? `(${acc.displayPercent})` : ''}</h4>
                        <div className="mt-auto"><p className="text-2xl font-bold text-slate-800">{formatCurrency(accountBalances[acc.id])}</p></div>
                      </div>
                    ))}
                  </div>
                </div>

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
              <button onClick={() => setShowOrderModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Nouveau Ticket</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-2xl border-dashed">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Aucune commande pour le moment.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4" /><span className="font-bold text-slate-800">{order.client}</span></div>
                      {order.status === 'ATTENTE' && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Attente</span>}
                      {order.status === 'EN_COURS' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><PlayCircle className="w-3 h-3"/> En cours</span>}
                      {order.status === 'TERMINE' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Terminé</span>}
                    </div>
                    <p className="text-sm text-slate-500 mb-4 h-10 overflow-hidden line-clamp-2">{order.description || "Aucune description"}</p>
                    <div className="bg-slate-50 p-3 rounded-xl mb-4 text-sm">
                      <div className="flex justify-between mb-1"><span className="text-slate-500">Total:</span><strong className="text-slate-800">{formatCurrency(order.total)}</strong></div>
                      <div className="flex justify-between mb-1"><span className="text-slate-500">Avance payée:</span><span className="text-emerald-600 font-medium">{formatCurrency(order.avance)}</span></div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                        <span className="text-slate-700">Reste à payer:</span>
                        <span className={order.total - order.avance > 0 ? "text-rose-600" : "text-emerald-600"}>{formatCurrency(Math.max(0, order.total - order.avance))}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'ATTENTE' && <button onClick={() => updateOrderStatus(order.id, 'EN_COURS')} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold">Lancer (En cours)</button>}
                      {order.status === 'EN_COURS' && <button onClick={() => updateOrderStatus(order.id, 'TERMINE')} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg text-sm font-semibold">Marquer Terminé</button>}
                      {order.status === 'TERMINE' && order.avance < order.total && <button onClick={() => updateOrderStatus(order.id, 'TERMINE')} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-semibold">Encaisser Reste</button>}
                      <button onClick={() => deleteOrder(order.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* VUE 3 : CLIENTS & CRÉANCES */}
        {/* ========================================= */}
        {activeTab === 'clients' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Base Clients & Créances</h2>
                <p className="text-indigo-200 mt-2 text-sm md:text-base">Générée automatiquement à partir de l'historique de vos commandes.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-center w-full md:w-auto">
                <p className="text-indigo-100 text-sm font-medium uppercase tracking-wide">Total des Créances (Impayés)</p>
                <p className="text-3xl font-extrabold mt-1 text-white">
                  {formatCurrency(clientStats.reduce((acc, c) => acc + c.debt, 0))}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Nom du Client</th>
                      <th className="px-6 py-4 font-semibold text-center">Nbr Commandes</th>
                      <th className="px-6 py-4 font-semibold text-right">Total Acheté</th>
                      <th className="px-6 py-4 font-semibold text-right">Reste à Payer (Dette)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientStats.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Aucun client enregistré pour l'instant.</td></tr>
                    ) : (
                      clientStats.map((client, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center uppercase text-xs">
                              {client.name.substring(0,2)}
                            </div>
                            {client.name}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold">{client.count}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(client.totalCmd)}</td>
                          <td className="px-6 py-4 text-right">
                            {client.debt > 0 ? (
                              <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" /> {formatCurrency(client.debt)}
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-medium flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-4 h-4" /> À jour
                              </span>
                            )}
                          </td>
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
        {/* VUE 4 : STOCK (INVENTAIRE) */}
        {/* ========================================= */}
        {activeTab === 'stock' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Gestion des Stocks</h2>
                {stockAlertsCount > 0 && <p className="text-rose-600 text-sm font-medium flex items-center gap-1 mt-1"><AlertTriangle className="w-4 h-4"/> {stockAlertsCount} article(s) en rupture ou stock critique.</p>}
              </div>
              <button onClick={() => setShowStockModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Nouvel Article</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inventory.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-2xl border-dashed">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Votre inventaire est vide.</p>
                </div>
              ) : (
                inventory.map((item) => {
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
                        <button onClick={() => deleteStockItem(item.id)} className="px-3 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* VUE 5 : DEVIS */}
        {/* ========================================= */}
        {activeTab === 'devis' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Devis & Estimations</h2>
                <p className="text-slate-500 text-sm mt-1">Créez et téléchargez vos devis.</p>
              </div>
              <button onClick={() => setShowQuoteModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                <PlusCircle className="w-5 h-5" /><span className="hidden sm:inline">Nouveau Devis</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-2xl border-dashed">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Aucun devis créé pour le moment.</p>
                </div>
              ) : (
                quotes.map((quote) => (
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
                      <button onClick={() => deleteQuote(quote.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
