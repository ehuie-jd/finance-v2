import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, ArrowDownRight, ArrowUpRight, PieChart, 
  History, AlertCircle, CheckCircle2, X, Filter,
  Settings, RefreshCw, Cloud
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
  // --- ETATS ---
  const [transactions, setTransactions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', type: 'error' });

  // Formulaire Opération Quotidienne
  const [opDate, setOpDate] = useState(new Date().toISOString().split('T')[0]);
  const [opRecette, setOpRecette] = useState('');
  const [opDepense, setOpDepense] = useState('');
  const [opDesc, setOpDesc] = useState('');

  // Formulaire Débit
  const [debDate, setDebDate] = useState(new Date().toISOString().split('T')[0]);
  const [debAccount, setDebAccount] = useState('fr_volatile');
  const [debAmount, setDebAmount] = useState('');
  const [debDesc, setDebDesc] = useState('');

  // --- NOUVEAUX ÉTATS : CLOUD SYNC ---
  const [showSettings, setShowSettings] = useState(false);
  const defaultSyncUrl = 'https://script.google.com/macros/s/AKfycbxfTye97lUS8bBS90zM8ERD4A6CgCtMlvcrAzTIJb2lOYF4jROADPk8XoHw7E52Yb0fNA/exec';
  const [syncUrl, setSyncUrl] = useState(defaultSyncUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // --- CHARGEMENT INITIAL (Local ou Cloud) ---
  useEffect(() => {
    const savedUrl = localStorage.getItem('finance_print_sync_url');
    if (savedUrl) setSyncUrl(savedUrl);

    const loadData = async () => {
      setIsSyncing(true);
      const urlToUse = savedUrl || defaultSyncUrl;
      if (urlToUse) {
        try {
          const res = await fetch(urlToUse);
          const data = await res.json();
          if (Array.isArray(data)) {
            setTransactions(data);
          }
        } catch (error) {
          console.error(error);
          showAlert('Erreur de connexion à Google Sheets, chargement local...', 'error');
          loadLocalData();
        }
      } else {
        loadLocalData();
      }
      setIsSyncing(false);
      setInitialLoadDone(true);
    };

    const loadLocalData = () => {
      const saved = localStorage.getItem('finance_print_data');
      if (saved) {
        try { setTransactions(JSON.parse(saved)); } catch (e) { console.error("Erreur locale"); }
      }
    };

    loadData();
  }, []);

  // --- SAUVEGARDE AUTOMATIQUE (Local + Cloud) ---
  useEffect(() => {
    if (!initialLoadDone) return;
    
    // 1. Sauvegarde locale instantanée
    localStorage.setItem('finance_print_data', JSON.stringify(transactions));
    
    // 2. Sauvegarde Cloud en arrière-plan
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
          showAlert('Erreur de synchronisation avec Google Sheets', 'error');
        } finally {
          setIsSyncing(false);
        }
      };
      const timeoutId = setTimeout(() => syncData(), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [transactions, syncUrl, initialLoadDone]);

  // --- CALCULS DYNAMIQUES ---
  
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

  // --- HANDLERS D'ACTIONS ---

  const showAlert = (message, type = 'error') => {
    setAlertInfo({ show: true, message, type });
    setTimeout(() => setAlertInfo({ show: false, message: '', type: 'error' }), 5000);
  };

  const handleAddDailyOp = (e) => {
    e.preventDefault();
    const r = parseFloat(opRecette) || 0;
    const d = parseFloat(opDepense) || 0;

    if (r === 0 && d === 0) {
      showAlert('Veuillez saisir un montant valide.', 'error');
      return;
    }

    const newBalance = caisseBalance + r - d;
    if (newBalance < 0) {
      showAlert(`Action refusée : Cette dépense rendrait la caisse négative (${formatCurrency(newBalance)}).`, 'error');
      return;
    }

    const newOp = {
      id: Date.now().toString(),
      type: 'DAILY_OP',
      date: opDate,
      recette: r,
      depense: d,
      description: opDesc || 'Mouvement de caisse quotidien'
    };

    setTransactions([...transactions, newOp]);
    setOpRecette('');
    setOpDepense('');
    setOpDesc('');
    showAlert('Opération enregistrée avec succès.', 'success');
  };

  const handleRepartition = () => {
    if (caisseBalance <= 0) {
      showAlert("Il n'y a aucun solde en caisse à répartir.", 'error');
      return;
    }

    const newRep = {
      id: Date.now().toString(),
      type: 'REPARTITION',
      date: new Date().toISOString().split('T')[0],
      amount: caisseBalance,
      description: 'Répartition automatique des fonds'
    };

    setTransactions([...transactions, newRep]);
    showAlert(`Le solde de ${formatCurrency(caisseBalance)} a été réparti dans vos comptes.`, 'success');
  };

  const handleDebit = (e) => {
    e.preventDefault();
    const amt = parseFloat(debAmount);

    if (!amt || amt <= 0) {
      showAlert('Montant invalide.', 'error');
      return;
    }

    if (accountBalances[debAccount] < amt) {
      showAlert("Fonds insuffisants dans ce compte !", 'error');
      return;
    }

    const newDebit = {
      id: Date.now().toString(),
      type: 'DEBIT',
      date: debDate,
      account: debAccount,
      amount: amt,
      description: debDesc || 'Débit manuel'
    };

    setTransactions([...transactions, newDebit]);
    setDebAmount('');
    setDebDesc('');
    showAlert('Débit effectué avec succès.', 'success');
  };

  const deleteTransaction = (id) => {
    const newHistory = transactions.filter(t => t.id !== id);
    setTransactions(newHistory);
  };

  // --- RENDU UI ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      
      {/* ALERTE MODAL/TOAST */}
      {alertInfo.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${alertInfo.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {alertInfo.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-medium">{alertInfo.message}</span>
            <button onClick={() => setAlertInfo({ show: false, message: '', type: 'error' })} className="ml-4 opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARAMÈTRES GOOGLE SHEETS */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" /> Paramètres Cloud
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Google Apps Script</label>
                <input 
                  type="text" 
                  placeholder="https://script.google.com/macros/s/..." 
                  value={syncUrl} 
                  onChange={(e) => {
                    setSyncUrl(e.target.value);
                    localStorage.setItem('finance_print_sync_url', e.target.value);
                  }}
                  className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Votre lien Google Sheets est verrouillé par défaut dans le code ! Vous pouvez le modifier temporairement ici si besoin.
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <PieChart className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">ImprimGestion Pro</h1>
          </div>
          <div className="flex items-center gap-3">
            
            {/* INDICATEUR DE SYNCHRONISATION */}
            {syncUrl && (
              <div className="hidden sm:flex items-center text-xs font-medium text-slate-500 mr-2 bg-slate-50 px-2 py-1 rounded-md">
                {isSyncing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin text-indigo-500" /> : <Cloud className="w-4 h-4 mr-1 text-emerald-500" />}
                {isSyncing ? 'Synchronisation...' : 'Synchronisé'}
              </div>
            )}

            <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
              <Filter className="w-4 h-4 mr-2" />
              Mois :
              <input 
                type="month" 
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="ml-2 bg-transparent border-none p-0 focus:ring-0 text-slate-700 cursor-pointer"
              />
            </div>

            {/* BOUTON PARAMÈTRES */}
            <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded-md transition-colors" title="Paramètres">
              <Settings className="w-5 h-5" />
            </button>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* STATS RAPIDES (MOIS EN COURS) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-50"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Caisse Disponible</p>
                <h2 className="text-4xl font-extrabold text-slate-800 mt-2">{formatCurrency(caisseBalance)}</h2>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-6">
              <button 
                onClick={handleRepartition}
                disabled={caisseBalance <= 0}
                className={`w-full py-2.5 rounded-lg font-semibold transition-all ${caisseBalance > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
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
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dépenses du mois</p>
                <h2 className="text-3xl font-bold text-rose-600 mt-2">-{formatCurrency(monthlyStats.depenses)}</h2>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-sm font-medium text-slate-500">
              Bénéfice opérationnel : <span className={(monthlyStats.recettes - monthlyStats.depenses) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {formatCurrency(monthlyStats.recettes - monthlyStats.depenses)}
              </span>
            </div>
          </div>
        </section>

        {/* CONTENU PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLONNE GAUCHE : FORMULAIRES */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Formulaire Nouvelle Opération */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">1</div>
                Opération Quotidienne
              </h3>
              <form onSubmit={handleAddDailyOp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required value={opDate} onChange={e => setOpDate(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">Recette (+)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={opRecette} onChange={e => setOpRecette(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-emerald-500 focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-rose-700 mb-1">Dépense (-)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={opDepense} onChange={e => setOpDepense(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-rose-500 focus:border-rose-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motif / Description</label>
                  <input type="text" placeholder="Ex: Vente comptoir, Achat papier..." value={opDesc} onChange={e => setOpDesc(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="pt-2">
                  <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm">
                    <div className="flex justify-between mb-1"><span>Disponible actuel :</span> <strong>{formatCurrency(caisseBalance)}</strong></div>
                    <div className="flex justify-between font-bold text-indigo-600 border-t border-slate-200 pt-1 mt-1">
                      <span>Nouveau Solde :</span>
                      <span>{formatCurrency(caisseBalance + (parseFloat(opRecette)||0) - (parseFloat(opDepense)||0))}</span>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-900 transition-colors">
                    Ajouter à la caisse
                  </button>
                </div>
              </form>
            </div>

            {/* Formulaire Débit Manuel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">2</div>
                Débit d'un Compte
              </h3>
              <form onSubmit={handleDebit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required value={debDate} onChange={e => setDebDate(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Compte à débiter</label>
                  <select value={debAccount} onChange={e => setDebAccount(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500">
                    {ACCOUNTS_CONFIG.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} (Solde: {formatCurrency(accountBalances[acc.id])})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant (-)</label>
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={debAmount} onChange={e => setDebAmount(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                  <input type="text" required placeholder="Ex: Achat machine..." value={debDesc} onChange={e => setDebDesc(e.target.value)} className="w-full rounded-lg border-slate-300 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <button type="submit" className="w-full mt-2 bg-white border-2 border-slate-800 text-slate-800 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors">
                  Valider le retrait
                </button>
              </form>
            </div>

          </div>

          {/* COLONNE DROITE : COMPTES ET HISTORIQUE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tableau de bord des comptes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Suivi des Comptes Dédiés</h3>
                <div className="w-12 h-12 rounded-full shadow-inner border-4 border-white" style={{
                  background: 'conic-gradient(#3b82f6 0% 36%, #6366f1 36% 45%, #10b981 45% 57%, #14b8a6 57% 65%, #f43f5e 65% 100%)'
                }}></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACCOUNTS_CONFIG.map((acc) => (
                  <div key={acc.id} className={`p-4 rounded-xl border ${acc.borderColor} bg-white shadow-sm flex flex-col`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${acc.color}`}></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">{acc.parent}</span>
                    </div>
                    <h4 className={`text-sm font-semibold mb-3 ${acc.textColor}`}>
                      {acc.name} {acc.displayPercent ? `(${acc.displayPercent})` : ''}
                    </h4>
                    <div className="mt-auto">
                      <p className="text-2xl font-bold text-slate-800">{formatCurrency(accountBalances[acc.id])}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historique Général */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500" />
                  Historique des Transactions
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Type</th>
                      <th className="px-6 py-4 font-semibold">Description</th>
                      <th className="px-6 py-4 font-semibold text-right">Montant</th>
                      <th className="px-6 py-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                          Aucune transaction pour ce mois.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-600">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                          <td className="px-6 py-4">
                            {t.type === 'DAILY_OP' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">Mouvement Caisse</span>}
                            {t.type === 'REPARTITION' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">Répartition Auto</span>}
                            {t.type === 'DEBIT' && <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-medium">Débit Compte</span>}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-800 font-medium truncate max-w-[200px]">{t.description}</p>
                            {t.type === 'DEBIT' && <p className="text-xs text-slate-500">Compte : {ACCOUNTS_CONFIG.find(c => c.id === t.account)?.name}</p>}
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            {t.type === 'DAILY_OP' && (
                              <div className="flex flex-col items-end">
                                {(t.recette || 0) > 0 && <span className="text-emerald-600">+{formatCurrency(t.recette)}</span>}
                                {(t.depense || 0) > 0 && <span className="text-rose-600">-{formatCurrency(t.depense)}</span>}
                              </div>
                            )}
                            {t.type === 'REPARTITION' && <span className="text-indigo-600">{formatCurrency(t.amount)}</span>}
                            {t.type === 'DEBIT' && <span className="text-orange-600">-{formatCurrency(t.amount)}</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => deleteTransaction(t.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <X className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
}