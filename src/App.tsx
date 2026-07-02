// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, FileText, Beer, Receipt, 
  Plus, Trash2, ChevronLeft, Save, CheckCircle, Edit,
  Printer, MessageSquare, CheckSquare, Paperclip, FileCode, LogOut, Settings, AlertTriangle
} from 'lucide-react';

// --- FIREBASE IMPORTS (CLOUD DATABASE & AUTH) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INITIALIZATIE ---
const firebaseConfig = {
  apiKey: "AIzaSyCI32rKb-DYb-3uAHOrBiQAfRrzunKl9Xg",
  authDomain: "vulcaan-event-planner.firebaseapp.com",
  projectId: "vulcaan-event-planner",
  storageBucket: "vulcaan-event-planner.firebasestorage.app",
  messagingSenderId: "43572345707",
  appId: "1:43572345707:web:4d11a732cad648b0ef6a2e",
  measurementId: "G-XJ9XYBWR38"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'vulcaan-event-planner';

// --- DATA & CONFIG ---
const TABS = {
  BRIEFING: 'briefing',
  OFFERTE: 'offerte',
  TURFLIJST: 'turflijst',
  DEBRIEFING: 'debriefing',
  FACTUUR: 'factuur'
};

// Prijzen direct INCLUSIEF btw
const DEFAULT_TURF_ITEMS = [
  { id: 'pils', naam: 'Vulcaan Pils, Wit, Amber', prijs: 4.50, btw: 21, categorie: 'Bier' },
  { id: 'speciaal', naam: 'Vulcaan Speciaalbier', prijs: 5.50, btw: 21, categorie: 'Bier' },
  { id: 'bier00', naam: '0.0% Bier', prijs: 5.00, btw: 9, categorie: 'Bier' },
  { id: 'wijn', naam: 'Huiswijn', prijs: 4.50, btw: 21, categorie: 'Wijn' },
  { id: 'cava', naam: 'Cava', prijs: 5.50, btw: 21, categorie: 'Wijn' },
  { id: 'gedestilleerd', naam: 'Gedestilleerd', prijs: 6.00, btw: 21, categorie: 'Sterk' },
  { id: 'cocktails', naam: 'Cocktails', prijs: 10.00, btw: 21, categorie: 'Sterk' },
  { id: 'fris', naam: 'Frisdrank', prijs: 3.50, btw: 9, categorie: 'Fris' },
  { id: 'koffie', naam: 'Koffie/Thee', prijs: 3.20, btw: 9, categorie: 'Warm' },
  { id: 'bitterbal', naam: 'Bitterballen (10st)', prijs: 11.00, btw: 9, categorie: 'Snacks' },
  { id: 'garnituur', naam: 'Bittergarnituur (10st)', prijs: 10.00, btw: 9, categorie: 'Snacks' },
];

const PREDEFINED_ACTIONS = [
  "AFSPRAAK MAKEN", 
  "OFFERTE VERSTUREN", 
  "KLANT BELLEN", 
  "TURFLIJST CONTROLEREN", 
  "FACTUUR VERSTUREN"
];

// --- MAIN APP COMPONENT ---
export default function App() {
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [user, setUser] = useState(null);
  
  // Login States
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 1. Authenticatie luisteraar instellen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error) {
      console.error("Login fout:", error);
      setLoginError('Inloggen mislukt. Controleer je e-mailadres en wachtwoord.');
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentEvent(null);
    } catch (error) {
      console.error("Logout fout:", error);
    }
  };

  // 2. Real-time Database Synchronisatie
  useEffect(() => {
    if (!user) return;

    const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const unsubscribe = onSnapshot(
      eventsRef,
      (snapshot) => {
        const fetchedEvents = [];
        snapshot.forEach((doc) => {
          fetchedEvents.push({ id: doc.id, ...doc.data() });
        });
        setEvents(fetchedEvents);
      },
      (error) => {
        console.error('Fout bij ophalen evenementen:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const openEvent = (event) => {
    setCurrentEvent(JSON.parse(JSON.stringify(event)));
  };

  const closeEvent = (e) => {
    if(e) e.preventDefault();
    setCurrentEvent(null);
  };

  // 3. Opslaan in de Cloud
  const saveEvent = async (updatedEvent) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', updatedEvent.id);
      await setDoc(docRef, updatedEvent);
    } catch (error) {
      console.error("Fout bij opslaan evenement:", error);
    }
    setCurrentEvent(updatedEvent);
  };

  // 4. Snelle updates in de Cloud (voor de dashboard acties)
  const updateEventPartial = async (id, updates) => {
    if (!user) return;
    const targetEvent = events.find(e => e.id === id);
    if (!targetEvent) return;
    const updatedEvent = { ...targetEvent, ...updates };

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', id);
      await setDoc(docRef, updatedEvent);
    } catch (error) {
      console.error("Fout bij updaten evenement:", error);
    }
  };

  // 5. Verwijderen uit de Cloud
  const handleDeleteConfirm = async () => {
    if (!user || !eventToDelete) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventToDelete.id));
    } catch (error) {
      console.error("Fout bij verwijderen evenement:", error);
    }
    setEventToDelete(null);
  };

  const createNewEvent = () => {
    const newEvent = {
      id: Date.now().toString(),
      naam: 'Nieuw Evenement',
      type: '',
      datum: '',
      status: 'OPTIE',
      actie: '',
      aanbetaling: 0,
      turflijstGecontroleerd: false,
      factuurVerzonden: false,
      schade: '',
      logboek: '',
      debriefing: { goed: '', beter: '', tevreden: '', opmerkingen: '' },
      briefing: {
        doelgroep: '', pax: '', allergieen: '',
        tijden: { getIn: '', start: '', eind: '' },
        contactKlant: '', bedrijfsnaam: '', adresKlant: '', postcodeKlant: '', woonplaatsKlant: '', referentieNummer: '',
        telefoonKlant: '', emailKlant: '', 
        contactVulcaan: '', telefoonVulcaan: '', emailVulcaan: '',
        omschrijvingProgramma: '', omschrijvingInrichting: '', omschrijvingVerzorging: '', bijlagen: '',
        todos: [], draaiboek: [], rooster: []
      },
      offerte: [
        { id: 'o1', dienst: 'Gebruikskosten Vulcaan', aantal: 1, uren: 1, tarief: 100.00, btw: 21, inFactuur: true },
        { id: 'o2', dienst: 'Personen drankjes*', aantal: 1, uren: 1, tarief: 4.50, btw: 21, inFactuur: false },
        { id: 'o3', dienst: 'Personen tafelgarnituur', aantal: 1, uren: 1, tarief: 2.00, btw: 9, inFactuur: false },
        { id: 'o4', dienst: 'Personen Bittergarnituur', aantal: 1, uren: 1, tarief: 1.00, btw: 9, inFactuur: false },
        { id: 'o5', dienst: 'Personen Bitterballen', aantal: 1, uren: 1, tarief: 1.10, btw: 9, inFactuur: false },
        { id: 'o5b', dienst: 'Luxe koude planken', aantal: 1, uren: 1, tarief: 4.50, btw: 9, inFactuur: false },
        { id: 'o6', dienst: 'Beamer, scherm, laptop', aantal: 1, uren: 1, tarief: 100.00, btw: 21, inFactuur: true },
        { id: 'o7', dienst: 'Schoonmaakkosten', aantal: 1, uren: 1, tarief: 75.00, btw: 21, inFactuur: true }
      ],
      turflijst: {},
      extraTurfItems: []
    };
    setCurrentEvent(newEvent);
  };

  // --- RENDER LOGIN SCHERM ALS NIET INGELOGD ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-700 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold tracking-wider">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border-t-4 border-red-700">
          <div className="text-center mb-8">
            <img 
              src="https://vulcaanbier.nl/Portals/2/Afbeeldingen/logo_pagelayout.png?ver=1y2YvKCvJSpqot8lBNhjog%3D%3D" 
              alt="Vulcaan Logo" 
              className="h-20 mx-auto mb-6 object-contain" 
            />
            <h2 className="text-2xl font-black text-gray-800">Event Manager</h2>
            <p className="text-sm text-gray-500 mt-1">Log in om verder te gaan</p>
          </div>
          
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">E-mailadres</label>
              <input 
                type="email" 
                required
                className="w-full border border-gray-300 rounded p-2.5 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="naam@vulcaanbier.nl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Wachtwoord</label>
              <input 
                type="password" 
                required
                className="w-full border border-gray-300 rounded p-2.5 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-red-700 text-white font-bold py-3 rounded hover:bg-red-800 transition shadow-md mt-2"
            >
              Inloggen
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER HOOFD APPLICATIE ALS WEL INGELOGD ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-12 relative">
      {/* Global Print Styles */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; font-size: 11pt; }
          .print-hidden { display: none !important; }
          .print-wrapper { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          .print-break-inside-avoid { page-break-inside: avoid; }
          .print-break-before { page-break-before: always; }
          .shadow-lg, .shadow-md, .shadow-sm, .shadow { box-shadow: none !important; border: none !important; }
          .print-border { border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-red-700 text-white p-4 shadow-md flex items-center justify-between print-hidden">
        <div className="flex items-center gap-3">
          <img 
            src="https://vulcaanbier.nl/Portals/2/Afbeeldingen/logo_pagelayout.png?ver=1y2YvKCvJSpqot8lBNhjog%3D%3D" 
            alt="Vulcaan Logo" 
            className="h-10 object-contain bg-white p-1 rounded shadow-sm" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="text-2xl font-bold tracking-wider uppercase hidden sm:block">Vulcaan Event Manager</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold opacity-90">{user.email}</span>
            <button onClick={handleLogout} className="text-xs flex items-center gap-1 hover:text-red-200 transition">
              <LogOut size={12}/> Uitloggen
            </button>
          </div>
          {currentEvent && (
            <button 
              type="button"
              onClick={closeEvent} 
              className="flex items-center gap-2 hover:bg-red-800 px-3 py-1 rounded transition border border-transparent hover:border-red-500 font-semibold ml-2"
            >
              <ChevronLeft size={20} /> <span className="hidden sm:inline">Terug naar overzicht</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto print-wrapper">
        {!currentEvent ? (
          <Dashboard 
            events={events} 
            onOpen={openEvent} 
            onCreate={createNewEvent} 
            onUpdateEvent={updateEventPartial}
            onDelete={(ev) => setEventToDelete(ev)}
          />
        ) : (
          <EventEditor event={currentEvent} onSave={saveEvent} onClose={closeEvent} />
        )}
      </main>

      {/* Custom Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print-hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border-t-4 border-red-600">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Weet je zeker dat je dit wilt verwijderen?</h3>
            <p className="text-gray-600 mb-6">
              Je staat op het punt het evenement <strong>"{eventToDelete.naam}"</strong> te verwijderen. De gegevens gaan permanent verloren en dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ events, onOpen, onCreate, onUpdateEvent, onDelete }) {
  const today = new Date().toISOString().split('T')[0];

  const eventsVandaag = events.filter(e => e.datum === today);
  const eventsToekomst = events.filter(e => e.datum > today || !e.datum).sort((a, b) => (a.datum || '9999').localeCompare(b.datum || '9999'));
  const eventsVerleden = events.filter(e => e.datum && e.datum < today).sort((a, b) => b.datum.localeCompare(a.datum));

  const [customActionId, setCustomActionId] = useState(null);
  const [customActionText, setCustomActionText] = useState('');

  const handleActieChange = (ev, val) => {
    if (val === 'CUSTOM') {
      setCustomActionId(ev.id);
      setCustomActionText('');
    } else {
      onUpdateEvent(ev.id, { actie: val });
    }
  };

  const saveCustomAction = (id) => {
    if (customActionText.trim()) {
      onUpdateEvent(id, { actie: customActionText.trim().toUpperCase() });
    }
    setCustomActionId(null);
  };

  const renderTable = (title, dataList, emptyMsg, headerColor) => (
    <div className="mb-8">
      <h3 className={`text-xl font-bold mb-3 px-3 py-2 rounded-t-lg ${headerColor} flex items-center gap-2 shadow-sm`}>
        {title === 'Vandaag' && <Clock size={20} />}
        {title === 'Toekomst' && <Calendar size={20} />}
        {title === 'Verleden' && <CheckCircle size={20} />}
        {title} <span className="text-sm font-normal opacity-80">({dataList.length})</span>
      </h3>
      <div className="bg-white rounded-b-lg shadow overflow-hidden border-x border-b border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-semibold text-gray-600">Datum</th>
                <th className="p-4 font-semibold text-gray-600">Naam Evenement</th>
                <th className="p-4 font-semibold text-gray-600">Type</th>
                <th className="p-4 font-semibold text-gray-600">PAX</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                {title === 'Verleden' && <th className="p-4 font-semibold text-gray-600">Afronding</th>}
                <th className="p-4 font-semibold text-gray-600">Actie</th>
              </tr>
            </thead>
            <tbody>
              {dataList.map(ev => (
                <tr key={ev.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-4 font-medium">{ev.datum || '-'}</td>
                  <td className="p-4">
                    <button onClick={() => onOpen(ev)} className="font-bold text-red-700 hover:text-red-900 hover:underline text-left text-lg">
                      {ev.naam}
                    </button>
                  </td>
                  <td className="p-4 text-gray-700">{ev.type}</td>
                  <td className="p-4 text-gray-700">{ev.briefing.pax}</td>
                  <td className="p-4">
                    <select 
                      value={ev.status || 'OPTIE'} 
                      onChange={e => onUpdateEvent(ev.id, {status: e.target.value})}
                      className={`px-2 py-1 rounded text-sm font-bold border outline-none cursor-pointer ${
                        ev.status === 'OPTIE' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        ev.status === 'BEVESTIGD' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}
                    >
                      <option value="OPTIE">OPTIE</option>
                      <option value="BEVESTIGD">BEVESTIGD</option>
                      <option value="GEANNULEERD">GEANNULEERD</option>
                    </select>
                  </td>
                  {title === 'Verleden' && (
                    <td className="p-4 text-sm whitespace-nowrap">
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={ev.turflijstGecontroleerd || false} 
                          onChange={e => onUpdateEvent(ev.id, {turflijstGecontroleerd: e.target.checked})} 
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-600 cursor-pointer" 
                        />
                        Turflijst gecontroleerd
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={ev.factuurVerzonden || false} 
                          onChange={e => onUpdateEvent(ev.id, {factuurVerzonden: e.target.checked})} 
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-600 cursor-pointer" 
                        />
                        Factuur verzonden
                      </label>
                    </td>
                  )}
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-3">
                      {customActionId === ev.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            autoFocus
                            value={customActionText}
                            onChange={(e) => setCustomActionText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveCustomAction(ev.id)}
                            placeholder="Typ actie..."
                            className="px-2 py-1 border border-yellow-400 rounded text-sm w-36 outline-none focus:ring-1 focus:ring-yellow-500"
                          />
                          <button onClick={() => saveCustomAction(ev.id)} className="text-green-600 hover:text-green-800 transition">
                            <CheckCircle size={20} />
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={ev.actie || ''}
                          onChange={e => handleActieChange(ev, e.target.value)}
                          className="px-2 py-1 rounded text-sm font-bold border outline-none cursor-pointer bg-yellow-100 text-yellow-800 border-yellow-200 w-48"
                        >
                          <option value="" disabled>Kies een actie...</option>
                          {PREDEFINED_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                          {ev.actie && !PREDEFINED_ACTIONS.includes(ev.actie) && (
                            <option value={ev.actie}>{ev.actie}</option>
                          )}
                          <option value="CUSTOM" className="italic font-bold">+ Eigen actie invoeren</option>
                        </select>
                      )}

                      {title === 'Verleden' && (
                        <div title={(!ev.turflijstGecontroleerd || !ev.factuurVerzonden) ? "Factuur nog niet verzonden!" : ""}>
                          <button
                            type="button"
                            onClick={() => onDelete(ev)}
                            disabled={!ev.turflijstGecontroleerd || !ev.factuurVerzonden}
                            className={`text-sm font-bold transition flex items-center gap-1 ${
                              (!ev.turflijstGecontroleerd || !ev.factuurVerzonden) 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-red-600 hover:text-red-800'
                            }`}
                          >
                            <Trash2 size={14}/> Verwijderen
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {dataList.length === 0 && (
                <tr>
                  <td colSpan={title === 'Verleden' ? "7" : "6"} className="p-6 text-center text-gray-500 italic">
                    {emptyMsg}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-gray-800">Overzicht Evenementen</h2>
        <button 
          type="button"
          onClick={onCreate}
          className="bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded shadow-lg flex items-center gap-2 transition font-bold"
        >
          <Plus size={20} /> Nieuwe Aanvraag
        </button>
      </div>

      {renderTable('Vandaag', eventsVandaag, 'Er zijn vandaag geen evenementen gepland.', 'bg-red-700 text-white')}
      {renderTable('Toekomst', eventsToekomst, 'Geen toekomstige evenementen gevonden.', 'bg-gray-200 text-gray-800')}
      {renderTable('Verleden', eventsVerleden, 'Geen afgeronde evenementen in het systeem.', 'bg-gray-100 text-gray-500')}
    </div>
  );
}

// --- EVENT EDITOR (TABS MANAGER) ---
function EventEditor({ event, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState(TABS.BRIEFING);
  const [formData, setFormData] = useState(event);

  useEffect(() => { setFormData(event); }, [event]);

  const updateField = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSave = () => onSave(formData);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[80vh] print-wrapper">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-gray-50 border-r flex flex-col print-hidden">
        <div className="p-4 border-b">
          <button 
            type="button"
            onClick={onClose} 
            className="mb-6 text-sm text-gray-600 hover:text-red-700 flex items-center gap-1 font-medium transition"
          >
            <ChevronLeft size={16} /> Terug naar overzicht
          </button>
          
          <div className="mb-2">
            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
              <Edit size={12}/> Naam evenement wijzigen
            </label>
            <input 
              type="text" 
              className="w-full font-bold text-xl bg-transparent border-b border-dashed border-gray-400 focus:outline-none focus:border-red-700 p-1"
              value={formData.naam}
              onChange={(e) => updateField('naam', e.target.value)}
              placeholder="Naam Evenement"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Datum</label>
            <input 
              type="date" 
              className="w-full text-sm bg-transparent border-b border-dashed border-gray-400 focus:outline-none focus:border-red-700 p-1 text-gray-600"
              value={formData.datum}
              onChange={(e) => updateField('datum', e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Status</label>
            <select
              className="w-full text-sm bg-white border rounded border-gray-300 p-1 outline-none focus:border-red-700 cursor-pointer"
              value={formData.status || 'OPTIE'}
              onChange={(e) => updateField('status', e.target.value)}
            >
              <option value="OPTIE">OPTIE</option>
              <option value="BEVESTIGD">BEVESTIGD</option>
              <option value="GEANNULEERD">GEANNULEERD</option>
            </select>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <TabButton icon={<FileText size={18}/>} label="1. Briefing & Info" active={activeTab === TABS.BRIEFING} onClick={() => setActiveTab(TABS.BRIEFING)} />
          <TabButton icon={<Receipt size={18}/>} label="2. Offerte" active={activeTab === TABS.OFFERTE} onClick={() => setActiveTab(TABS.OFFERTE)} />
          <TabButton icon={<Beer size={18}/>} label="3. Turflijst (Bar)" active={activeTab === TABS.TURFLIJST} onClick={() => setActiveTab(TABS.TURFLIJST)} />
          <TabButton icon={<MessageSquare size={18}/>} label="4. Debriefing" active={activeTab === TABS.DEBRIEFING} onClick={() => setActiveTab(TABS.DEBRIEFING)} />
          <TabButton icon={<CheckCircle size={18}/>} label="5. Facturatie" active={activeTab === TABS.FACTUUR} onClick={() => setActiveTab(TABS.FACTUUR)} />
        </nav>
        <div className="p-4 border-t">
          <button type="button" onClick={handleSave} className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded flex items-center justify-center gap-2 transition font-bold shadow">
            <Save size={18} /> Opslaan
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 print-wrapper relative">
        {activeTab === TABS.BRIEFING && <TabBriefing data={formData} updateField={updateField} />}
        {activeTab === TABS.OFFERTE && <TabOfferte data={formData} updateField={updateField} />}
        {activeTab === TABS.TURFLIJST && <TabTurflijst data={formData} updateField={updateField} />}
        {activeTab === TABS.DEBRIEFING && <TabDebriefing data={formData} updateField={updateField} />}
        {activeTab === TABS.FACTUUR && <TabFactuur data={formData} />}
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition ${
        active ? 'bg-red-100 text-red-900 font-bold border-l-4 border-red-700' : 'text-gray-600 hover:bg-gray-200 border-l-4 border-transparent'
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function PrintHeader({ title }) {
  return (
    <div className="flex justify-between items-end border-b border-red-200 pb-2 mb-6 print-hidden">
      <h2 className="text-2xl font-bold text-red-800">{title}</h2>
      <button 
        type="button" 
        onClick={() => {
          try { window.print(); } catch(e) { console.error('Print blocked in iframe:', e); }
        }} 
        className="bg-gray-800 text-white px-4 py-2 rounded text-sm flex gap-2 items-center hover:bg-gray-900 transition shadow"
      >
        <Printer size={16} /> Print / Maak PDF
      </button>
    </div>
  );
}

// TAB 1: BRIEFING & INFO (Print voor personeel)
function TabBriefing({ data, updateField }) {
  const b = data.briefing;
  const o = data.offerte;

  const addTodoItem = () => {
    updateField('briefing.todos', [...b.todos, { id: Date.now().toString(), taak: '', voldaan: false }]);
  };

  const updateTodoItem = (id, field, value) => {
    updateField('briefing.todos', b.todos.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTodoItem = (id) => {
    updateField('briefing.todos', b.todos.filter(t => t.id !== id));
  };

  const addDraaiboekItem = () => {
    updateField('briefing.draaiboek', [...b.draaiboek, { tijd: '', omschrijving: '', wie: '' }]);
  };

  const updateDraaiboek = (index, field, value) => {
    const newDb = [...b.draaiboek];
    newDb[index][field] = value;
    updateField('briefing.draaiboek', newDb);
  };

  const removeDraaiboekItem = (idx) => {
    updateField('briefing.draaiboek', b.draaiboek.filter((_, i) => i !== idx));
  };

  const addRoosterItem = () => {
    updateField('briefing.rooster', [...b.rooster, { naam: '', rol: '', starttijd: '', eindtijd: '', werkelijk: '' }]);
  };

  const updateRooster = (index, field, value) => {
    const newRooster = [...b.rooster];
    newRooster[index][field] = value;
    updateField('briefing.rooster', newRooster);
  };

  const removeRoosterItem = (idx) => {
    updateField('briefing.rooster', b.rooster.filter((_, i) => i !== idx));
  };

  const isCalendarReady = data.datum && b.tijden.start && b.tijden.eind;

  const getGoogleCalendarUrl = () => {
    if (!isCalendarReady) return '#';

    const start = new Date(`${data.datum}T${b.tijden.start}`);
    const end = new Date(`${data.datum}T${b.tijden.eind}`);
    if (end < start) end.setDate(end.getDate() + 1);

    const formatDt = (d) => {
      return d.getFullYear().toString() + 
             (d.getMonth() + 1).toString().padStart(2, '0') + 
             d.getDate().toString().padStart(2, '0') + 'T' + 
             d.getHours().toString().padStart(2, '0') + 
             d.getMinutes().toString().padStart(2, '0') + '00';
    };

    const dates = `${formatDt(start)}/${formatDt(end)}`;

    const details = `
=== ALGEMEEN ===
Type: ${data.type || '-'}
Doelgroep: ${b.doelgroep || '-'}
PAX: ${b.pax || '-'}
Get in: ${b.tijden.getIn || '-'}

=== CONTACT KLANT ===
Naam: ${b.contactKlant || '-'}
Bedrijf: ${b.bedrijfsnaam || '-'}
Adres: ${b.adresKlant || '-'}
Postcode/Plaats: ${b.postcodeKlant || '-'} ${b.woonplaatsKlant || '-'}
Telefoon: ${b.telefoonKlant || '-'}
E-mail: ${b.emailKlant || '-'}
Ref/PO: ${b.referentieNummer || '-'}

=== CONTACT VULCAAN ===
Verantwoordelijke: ${b.contactVulcaan || '-'}
Telefoon: ${b.telefoonVulcaan || '-'}
E-mail: ${b.emailVulcaan || '-'}

=== OMSCHRIJVINGEN ===
Programma:
${b.omschrijvingProgramma || '-'}

Inrichting:
${b.omschrijvingInrichting || '-'}

Verzorging:
${b.omschrijvingVerzorging || '-'}
    `.trim();

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: data.naam || 'Nieuw Evenement',
      dates: dates,
      details: details,
      location: 'Oosthavenkade 90/92, 3134 KA Vlaardingen',
      ctz: 'Europe/Amsterdam' 
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <PrintHeader title="Briefing Evenement" />
      
      {/* Google Calendar Link */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm print-hidden gap-4">
        <div>
          <h4 className="font-bold text-blue-800 flex items-center gap-2"><Calendar size={18} /> Exporteer naar Google Calendar</h4>
          <p className="text-sm text-blue-600 mt-1">Zet dit evenement direct in je agenda.</p>
          {!isCalendarReady && <p className="text-xs text-red-500 mt-1 font-bold">Vul eerst een datum, starttijd en eindtijd in.</p>}
        </div>
        <a 
          href={isCalendarReady ? getGoogleCalendarUrl() : '#'}
          target={isCalendarReady ? "_blank" : "_self"}
          rel="noopener noreferrer"
          className={`px-4 py-2 rounded shadow font-bold flex items-center justify-center gap-2 transition whitespace-nowrap ${
            isCalendarReady ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={(e) => {
            if (!isCalendarReady) e.preventDefault();
          }}
        >
          <Calendar size={18} /> Voeg toe aan agenda
        </a>
      </div>

      {/* Header zichtbaar tijdens printen */}
      <div className="hidden print-only mb-6 border-b-2 border-black pb-4">
        <img src="https://vulcaanbier.nl/Portals/2/Afbeeldingen/logo_pagelayout.png?ver=1y2YvKCvJSpqot8lBNhjog%3D%3D" alt="Vulcaan" className="h-12 mb-4" />
        <h1 className="text-3xl font-bold">Interne Briefing: {data.naam}</h1>
        <p className="text-lg font-medium">Datum: {data.datum || 'Nog niet ingevuld'}</p>
      </div>

      {/* Algemeen & Tijden */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
        <div className="bg-white p-4 rounded-lg print-border shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-1 text-red-800"><Calendar size={18} /> Algemeen</h3>
          <Input label="Type Evenement" value={data.type} onChange={(v) => updateField('type', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Doelgroep" value={b.doelgroep} onChange={(v) => updateField('briefing.doelgroep', v)} />
            <Input label="Aantal personen (PAX)" type="number" value={b.pax} onChange={(v) => updateField('briefing.pax', v)} />
          </div>
          <Input label="Dieetwensen / Allergieën" value={b.allergieen} onChange={(v) => updateField('briefing.allergieen', v)} placeholder="Bijv. 2x Glutenvrij, 1x Vega..." />
        </div>
        <div className="bg-white p-4 rounded-lg print-border shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-1 text-red-800"><Clock size={18} /> Tijden</h3>
          <div className="grid grid-cols-3 gap-2">
            <TimeInput label="Get in" value={b.tijden.getIn} onChange={(v) => updateField('briefing.tijden.getIn', v)} />
            <TimeInput label="Start event" value={b.tijden.start} onChange={(v) => updateField('briefing.tijden.start', v)} />
            <TimeInput label="Einde event" value={b.tijden.eind} onChange={(v) => updateField('briefing.tijden.eind', v)} />
          </div>
        </div>
      </div>

      {/* Checklist / To-Do's */}
      <div className="bg-white p-4 rounded-lg print-border shadow-sm space-y-4 print-break-inside-avoid">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-lg text-red-800 flex items-center gap-2"><CheckSquare size={18} /> To-Do / Checklist (Voorbereiding)</h3>
          <button type="button" onClick={addTodoItem} className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded flex items-center gap-1 transition print-hidden font-semibold">
            <Plus size={14} /> <span>Taak toevoegen</span>
          </button>
        </div>
        <div className="space-y-2">
          {b.todos.map((todo) => (
            <div key={todo.id} className="flex gap-2 items-center">
              <input 
                type="checkbox" 
                checked={todo.voldaan} 
                onChange={(e) => updateTodoItem(todo.id, 'voldaan', e.target.checked)}
                className="w-5 h-5 text-red-600 rounded cursor-pointer"
              />
              <input 
                type="text" 
                placeholder="Omschrijving taak..." 
                className={`border rounded p-2 text-sm flex-1 outline-none ${todo.voldaan ? 'line-through text-gray-400 bg-gray-50' : 'focus:border-red-700'}`} 
                value={todo.taak} 
                onChange={(e) => updateTodoItem(todo.id, 'taak', e.target.value)} 
              />
              <button type="button" onClick={() => removeTodoItem(todo.id)} className="text-red-500 p-2 hover:bg-red-50 rounded print-hidden"><Trash2 size={18}/></button>
            </div>
          ))}
          {b.todos.length === 0 && <p className="text-sm text-gray-500 italic">Geen to-do's ingevoerd. Voeg taken toe om de voorbereiding te tracken.</p>}
        </div>
      </div>

      {/* Contactgegevens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-lg print-border shadow-sm print-break-inside-avoid">
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-1 text-red-800">Contact & Facturatie Klant</h3>
          <Input label="Naam Contactpersoon" value={b.contactKlant} onChange={(v) => updateField('briefing.contactKlant', v)} />
          <Input label="Bedrijfsnaam (optioneel)" value={b.bedrijfsnaam} onChange={(v) => updateField('briefing.bedrijfsnaam', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Straat en Huisnummer" value={b.adresKlant} onChange={(v) => updateField('briefing.adresKlant', v)} />
            <Input label="Postcode" value={b.postcodeKlant} onChange={(v) => updateField('briefing.postcodeKlant', v)} />
          </div>
          <Input label="Woonplaats" value={b.woonplaatsKlant} onChange={(v) => updateField('briefing.woonplaatsKlant', v)} />
          <Input label="Referentienummer / PO (optioneel)" value={b.referentieNummer} onChange={(v) => updateField('briefing.referentieNummer', v)} />
          <Input label="Telefoonnummer" value={b.telefoonKlant} onChange={(v) => updateField('briefing.telefoonKlant', v)} />
          <Input label="E-mailadres" value={b.emailKlant} onChange={(v) => updateField('briefing.emailKlant', v)} />
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-1 text-red-800">Contact Vulcaan</h3>
          <Input label="Verantwoordelijke Vulcaan" value={b.contactVulcaan} onChange={(v) => updateField('briefing.contactVulcaan', v)} />
          <Input label="Telefoonnummer" value={b.telefoonVulcaan} onChange={(v) => updateField('briefing.telefoonVulcaan', v)} />
          <Input label="E-mailadres" value={b.emailVulcaan} onChange={(v) => updateField('briefing.emailVulcaan', v)} />
        </div>
      </div>

      {/* Omschrijvingen & Bijlagen */}
      <div className="bg-white p-4 rounded-lg print-border shadow-sm space-y-4 print-break-inside-avoid">
        <h3 className="font-bold text-lg border-b pb-1 text-red-800">Omschrijvingen</h3>
        <Textarea label="Programma" value={b.omschrijvingProgramma} onChange={(v) => updateField('briefing.omschrijvingProgramma', v)} />
        <Textarea label="Inrichting (zaal, tent, etc.)" value={b.omschrijvingInrichting} onChange={(v) => updateField('briefing.omschrijvingInrichting', v)} />
        <Textarea label="Verzorging (eten, drinken, extra's)" value={b.omschrijvingVerzorging} onChange={(v) => updateField('briefing.omschrijvingVerzorging', v)} />
        
        <div className="mt-4 pt-4 border-t border-gray-100 print-hidden">
          <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-2"><Paperclip size={16} /> Bijlagen / Upload Notities</h4>
          <p className="text-xs text-gray-500 mb-2 print-hidden">Plaats hier links naar cloudmappen of aantekeningen over externe facturen.</p>
          <Textarea label="" value={b.bijlagen} onChange={(v) => updateField('briefing.bijlagen', v)} />
        </div>
      </div>

      {/* Draaiboek */}
      <div className="bg-white p-4 rounded-lg print-border shadow-sm space-y-4 print-break-inside-avoid">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-lg text-red-800">Draaiboek</h3>
          <button type="button" onClick={addDraaiboekItem} className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded flex items-center gap-1 transition print-hidden font-semibold">
            <Plus size={14} /> <span>Regel toevoegen</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="space-y-2 min-w-[600px]">
            {b.draaiboek.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <TimeSelect value={item.tijd} onChange={(v) => updateDraaiboek(idx, 'tijd', v)} className="w-24" />
                <input type="text" placeholder="Omschrijving actie" className="border rounded p-2 text-sm flex-1" value={item.omschrijving} onChange={(e) => updateDraaiboek(idx, 'omschrijving', e.target.value)} />
                <input type="text" placeholder="Wie?" className="border rounded p-2 text-sm w-40" value={item.wie} onChange={(e) => updateDraaiboek(idx, 'wie', e.target.value)} />
                <button type="button" onClick={() => removeDraaiboekItem(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded print-hidden"><Trash2 size={18}/></button>
              </div>
            ))}
            {b.draaiboek.length === 0 && <p className="text-sm text-gray-500 italic">Geen draaiboek items ingevoerd.</p>}
          </div>
        </div>
      </div>

      {/* Rooster (met uren nacalculatie) */}
      <div className="bg-white p-4 rounded-lg print-border shadow-sm space-y-4 print-break-inside-avoid">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-lg text-red-800">Werkrooster Personeel</h3>
          <button type="button" onClick={addRoosterItem} className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded flex items-center gap-1 transition print-hidden font-semibold">
            <Plus size={14} /> <span>Regel toevoegen</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="space-y-2 min-w-[700px]">
            {b.rooster.length > 0 && (
              <div className="flex gap-2 px-1 pb-1">
                <span className="flex-1 text-xs font-bold text-gray-500 uppercase">Naam</span>
                <span className="w-32 text-xs font-bold text-gray-500 uppercase">Rol</span>
                <span className="w-24 text-xs font-bold text-gray-500 uppercase text-center">Start</span>
                <span className="w-24 text-xs font-bold text-gray-500 uppercase text-center">Eind</span>
                <span className="w-24 text-xs font-bold text-gray-500 uppercase text-center print-hidden" title="Daadwerkelijk gewerkte uren invullen achteraf">Werkelijk (U)</span>
                <span className="w-10 print-hidden"></span>
              </div>
            )}
            {b.rooster.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input type="text" placeholder="Naam medewerker" className="border rounded p-2 text-sm flex-1" value={item.naam} onChange={(e) => updateRooster(idx, 'naam', e.target.value)} />
                <input type="text" placeholder="Rol (bijv. Bar)" className="border rounded p-2 text-sm w-32" value={item.rol} onChange={(e) => updateRooster(idx, 'rol', e.target.value)} />
                <TimeSelect value={item.starttijd} onChange={(v) => updateRooster(idx, 'starttijd', v)} className="w-24" />
                <TimeSelect value={item.eindtijd} onChange={(v) => updateRooster(idx, 'eindtijd', v)} className="w-24" />
                <input type="number" step="0.25" placeholder="Uren" className="border rounded p-2 text-sm w-24 text-center bg-gray-50 focus:bg-white print-hidden" value={item.werkelijk || ''} onChange={(e) => updateRooster(idx, 'werkelijk', e.target.value)} title="Vul hier na afloop de echt gemaakte uren in" />
                <button type="button" onClick={() => removeRoosterItem(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded print-hidden w-10"><Trash2 size={18}/></button>
              </div>
            ))}
            {b.rooster.length === 0 && <p className="text-sm text-gray-500 italic">Geen personeelsrooster ingevoerd.</p>}
          </div>
        </div>
      </div>

      {/* EXTRA IN DE PRINT: Offerte overzicht voor het personeel */}
      {o && o.length > 0 && (
        <div className="hidden print:block print-break-before">
          <h3 className="text-xl font-bold border-b-2 border-red-700 pb-1 mb-4">Interne info: Te verzorgen diensten & raming</h3>
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border-b border-gray-300 w-16 text-center">Aantal</th>
                <th className="p-2 border-b border-gray-300">Omschrijving</th>
                <th className="p-2 border-b border-gray-300 w-16 text-center">Uren</th>
              </tr>
            </thead>
            <tbody>
              {o.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="p-2 text-center text-gray-600">{row.aantal || 1}</td>
                  <td className="p-2 text-gray-800 font-semibold">{row.dienst}</td>
                  <td className="p-2 text-center text-gray-600">{row.uren || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2 italic">Dit overzicht is voor intern gebruik om te weten wat er is afgesproken in de raming.</p>
        </div>
      )}

    </div>
  );
}

// TAB 2: OFFERTE / RAMING (EN GECOMBINEERDE KLANT PDF)
function TabOfferte({ data, updateField }) {
  const o = data.offerte;
  const b = data.briefing;

  const addRow = () => {
    updateField('offerte', [...o, { id: Date.now().toString(), dienst: '', aantal: 1, uren: 1, tarief: 0, btw: 21, inFactuur: true }]);
  };

  const updateRow = (id, field, value) => {
    const newO = o.map(row => {
      if (row.id === id) {
        const val = typeof value === 'boolean' ? value : (Number(value) || value);
        return { ...row, [field]: val };
      }
      return row;
    });
    updateField('offerte', newO);
  };

  const removeRow = (id) => {
    updateField('offerte', o.filter(row => row.id !== id));
  };

  const calcTotaal = (row) => (Number(row.aantal) || 1) * (Number(row.uren) || 1) * (Number(row.tarief) || 0);

  let totaalIncl = 0;
  let btw9Bedrag = 0;
  let btw21Bedrag = 0;

  o.forEach(row => {
    const totIncl = calcTotaal(row);
    totaalIncl += totIncl;
    if (Number(row.btw) === 9) {
      btw9Bedrag += totIncl - (totIncl / 1.09);
    } else if (Number(row.btw) === 21) {
      btw21Bedrag += totIncl - (totIncl / 1.21);
    }
  });

  const totaalEx = totaalIncl - btw9Bedrag - btw21Bedrag;

  return (
    <div className="space-y-6 animate-in fade-in relative">
      
      <div className="flex justify-between items-end border-b border-red-200 pb-2 mb-6 print-hidden">
        <h2 className="text-2xl font-bold text-red-800">Offerte & Raming</h2>
        <div className="flex gap-2">
          {/* Mail knop verwijderd, zoals gevraagd */}
          <button 
            type="button" 
            onClick={() => {
              try { window.print(); } catch(e) { console.error('Print blocked in iframe:', e); }
            }} 
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm flex gap-2 items-center hover:bg-gray-900 transition shadow"
          >
            <Printer size={16} /> Print / Maak PDF
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4 print-hidden bg-gray-100 p-3 rounded border border-gray-200">
        <strong>Instructie:</strong> Zet het vinkje bij <strong>"In Factuur?"</strong> <em>uit</em> bij consumpties en hapjes die later via de turflijst worden geturfd. Alle bedragen invoeren <strong>inclusief BTW</strong>.
      </p>

      {/* ---- NORMALE EDITOR WEERGAVE (VERBORGEN BIJ PRINT) ---- */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden print-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 w-20 text-center">Aantal</th>
                <th className="p-3">Dienst / Omschrijving</th>
                <th className="p-3 w-20 text-center">Aantal</th>
                <th className="p-3 w-32 text-right">Tarief</th>
                <th className="p-3 w-20 text-center">BTW %</th>
                <th className="p-3 w-32 text-right">Totaal</th>
                <th className="p-3 w-24 text-center font-semibold" title="Zet dit vinkje UIT voor consumpties die via de turflijst lopen">In factuur?</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {o.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <input type="number" className="w-full border-gray-300 rounded p-1 text-sm text-center" value={row.aantal} onChange={(e) => updateRow(row.id, 'aantal', e.target.value)}/>
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full border-gray-300 rounded p-1 text-sm font-medium text-gray-800" value={row.dienst} onChange={(e) => updateRow(row.id, 'dienst', e.target.value)} placeholder="Gebruikskosten, bitterballen, etc."/>
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full border-gray-300 rounded p-1 text-sm text-center" value={row.uren} onChange={(e) => updateRow(row.id, 'uren', e.target.value)}/>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-between border border-gray-300 rounded p-1 bg-white focus-within:border-red-700 focus-within:ring-1 focus-within:ring-red-700 overflow-hidden">
                      <span className="text-gray-500 font-semibold pl-1">€</span>
                      <input type="number" step="0.01" className="w-full text-right outline-none bg-transparent text-sm font-semibold" value={row.tarief} onChange={(e) => updateRow(row.id, 'tarief', e.target.value)}/>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <select className="w-full border-gray-300 rounded p-1 text-sm" value={row.btw} onChange={(e) => updateRow(row.id, 'btw', e.target.value)}>
                      <option value="9">9%</option>
                      <option value="21">21%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>
                  <td className="p-2 text-right font-bold text-gray-950 text-sm">
                    € {calcTotaal(row).toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-red-700 rounded focus:ring-red-700 cursor-pointer" 
                      checked={row.inFactuur !== false} 
                      onChange={(e) => updateRow(row.id, 'inFactuur', e.target.checked)} 
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 transition"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b">
          <button type="button" onClick={addRow} className="text-red-700 font-bold flex items-center gap-1 hover:underline transition">
            <Plus size={16} /> <span>Regel toevoegen</span>
          </button>
          
          <div className="text-right text-sm space-y-1 w-72">
            <div className="flex justify-between text-lg font-black text-red-800 border-b border-gray-300 pb-2 mb-2">
              <span>Totaal incl. BTW:</span>
              <span>€ {totaalIncl.toFixed(2)}</span>
            </div>
            {btw9Bedrag > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Waarin begrepen 9% BTW:</span>
                <span>€ {btw9Bedrag.toFixed(2)}</span>
              </div>
            )}
            {btw21Bedrag > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Waarin begrepen 21% BTW:</span>
                <span>€ {btw21Bedrag.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-semibold pt-2 mt-2 border-t border-gray-200">
              <span>Totaal excl. BTW:</span>
              <span>€ {totaalEx.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 italic mt-2 text-left pt-2">
              *Schatting, dranken worden altijd gefactureerd op basis van nacalculatie.
            </p>
          </div>
        </div>

        {/* Aanbetaling / Borg Sectie */}
        <div className="p-4 bg-gray-100 flex justify-end">
          <div className="flex items-center gap-3">
            <label className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Reeds betaald (Aanbetaling/Borg):</label>
            <div className="flex items-center bg-white border border-gray-300 rounded px-2 py-1 shadow-sm focus-within:border-red-600">
              <span className="text-gray-500 font-bold">€</span>
              <input 
                type="number" 
                step="0.01" 
                className="w-24 text-right outline-none font-bold text-gray-800 bg-transparent" 
                value={data.aanbetaling || ''} 
                onChange={(e) => updateField('aanbetaling', parseFloat(e.target.value) || 0)} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- SPECIALE COMBINATIE PRINT WEERGAVE VOOR DE KLANT ---- */}
      <div className="hidden print:block bg-white p-8">
        
        {/* Header Offerte */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <img 
              src="https://vulcaanbier.nl/Portals/2/Afbeeldingen/logo_pagelayout.png?ver=1y2YvKCvJSpqot8lBNhjog%3D%3D" 
              alt="Vulcaan Logo" 
              className="h-16 mb-2 object-contain" 
            />
            <p className="text-sm text-gray-500 font-semibold">Oosthavenkade 90/92<br/>3134 KA Vlaardingen</p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-red-800 uppercase tracking-widest mb-4">Offerte</h1>
            {b.bedrijfsnaam && <h3 className="font-bold text-lg text-gray-900">{b.bedrijfsnaam}</h3>}
            <h3 className={b.bedrijfsnaam ? "font-medium text-gray-700" : "font-bold text-lg text-gray-900"}>
              T.a.v. {b.contactKlant}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {b.adresKlant}<br/>
              {b.postcodeKlant} {b.woonplaatsKlant}
            </p>
          </div>
        </div>

        {/* Introductie & Evenement Details */}
        <div className="mb-10">
          <h3 className="text-xl font-bold border-b-2 border-red-700 pb-1 mb-4">Specificaties Evenement</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="font-bold py-1 w-40">Evenement:</td><td>{data.naam}</td></tr>
              <tr><td className="font-bold py-1">Datum:</td><td>{data.datum}</td></tr>
              <tr><td className="font-bold py-1">Tijden:</td><td>Start: {b.tijden.start || '-'} | Einde: {b.tijden.eind || '-'}</td></tr>
              <tr><td className="font-bold py-1">Aantal personen:</td><td>{b.pax || '-'} personen</td></tr>
              {b.referentieNummer && <tr><td className="font-bold py-1">Uw referentie:</td><td>{b.referentieNummer}</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Programma / Inrichting / Verzorging */}
        <div className="mb-12 space-y-6 print-break-inside-avoid">
          {b.omschrijvingProgramma && (
            <div>
              <h4 className="font-bold text-red-800 mb-1">Programma</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.omschrijvingProgramma}</p>
            </div>
          )}
          {b.omschrijvingInrichting && (
            <div>
              <h4 className="font-bold text-red-800 mb-1">Inrichting</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.omschrijvingInrichting}</p>
            </div>
          )}
          {b.omschrijvingVerzorging && (
            <div>
              <h4 className="font-bold text-red-800 mb-1">Verzorging</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{b.omschrijvingVerzorging}</p>
            </div>
          )}
        </div>

        {/* Offerte Tabel (Klantweergave) */}
        <div className="print-break-before">
          <h3 className="text-xl font-bold border-b-2 border-red-700 pb-1 mb-4">Kostenraming</h3>
          <table className="w-full text-sm mb-6 border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border-b border-gray-300 w-16 text-center">Aantal</th>
                <th className="p-2 border-b border-gray-300">Omschrijving</th>
                <th className="p-2 border-b border-gray-300 w-16 text-center">Aantal</th>
                <th className="p-2 border-b border-gray-300 text-right w-32">Tarief (incl BTW)</th>
                <th className="p-2 border-b border-gray-300 text-right w-32">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {o.map(row => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="p-2 text-center text-gray-600">{row.aantal || 1}</td>
                  <td className="p-2 text-gray-800 font-semibold">{row.dienst}</td>
                  <td className="p-2 text-center text-gray-600">{row.uren || 1}</td>
                  <td className="p-2 text-right text-gray-600">€ {Number(row.tarief).toFixed(2)}</td>
                  <td className="p-2 text-right text-gray-950 font-bold">€ {calcTotaal(row).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totalen Berekeningen voor de Klant */}
        <div className="w-full flex justify-between items-end mt-4 print-break-inside-avoid">
          <p className="text-xs text-gray-500 italic max-w-sm">
            *Schatting, dranken worden altijd gefactureerd op basis van nacalculatie tenzij anders overeengekomen.
          </p>
          <div className="w-72 space-y-2 text-sm border-t-2 border-gray-800 pt-2">
            <div className="flex justify-between text-lg font-black text-red-800 border-b border-gray-300 pb-2 mb-2">
              <span>Totaal incl. BTW:</span>
              <span>€ {totaalIncl.toFixed(2)}</span>
            </div>
            {btw9Bedrag > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Waarin begrepen 9% BTW:</span>
                <span>€ {btw9Bedrag.toFixed(2)}</span>
              </div>
            )}
            {btw21Bedrag > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Waarin begrepen 21% BTW:</span>
                <span>€ {btw21Bedrag.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-semibold pt-2 mt-2 border-t border-gray-200">
              <span>Totaal excl. BTW:</span>
              <span>€ {totaalEx.toFixed(2)}</span>
            </div>
            
            {Number(data.aanbetaling) > 0 && (
              <div className="flex justify-between text-gray-600 font-semibold pt-1">
                <span>Reeds voldaan (Borg):</span>
                <span>- € {Number(data.aanbetaling).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// TAB 3: TURFLIJST BAR
function TabTurflijst({ data, updateField }) {
  const t = data.turflijst || {};
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState('');

  // Bulk update states voor administratie
  const [bulkItemId, setBulkItemId] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');

  const increment = (id) => {
    updateField(`turflijst.${id}`, (t[id] || 0) + 1);
  };

  const decrement = (id) => {
    if (t[id] > 0) {
      updateField(`turflijst.${id}`, t[id] - 1);
    }
  };

  const addCustomItem = () => {
    if (!newCustomName || !newCustomPrice) return;
    const inclPrijs = parseFloat(newCustomPrice.replace(',', '.'));
    const newItem = {
      id: 'custom_' + Date.now(),
      naam: newCustomName,
      prijs: inclPrijs, // Opgeslagen als Inclusief BTW
      btw: 21, 
      categorie: 'Extra'
    };
    const currentExtras = data.extraTurfItems || [];
    updateField('extraTurfItems', [...currentExtras, newItem]);
    setNewCustomName('');
    setNewCustomPrice('');
  };

  const handleBulkUpdate = () => {
    if (!bulkItemId || bulkAmount === '') return;
    const amount = parseInt(bulkAmount, 10);
    if (isNaN(amount) || amount < 0) return;
    updateField(`turflijst.${bulkItemId}`, amount);
    setBulkItemId('');
    setBulkAmount('');
  };

  const allItems = [...DEFAULT_TURF_ITEMS, ...(data.extraTurfItems || [])];
  
  // Custom volgorde voor categorieën voor een logische opbouw
  const order = ['Bier', 'Wijn', 'Sterk', 'Fris', 'Warm', 'Snacks', 'Extra'];
  const categories = [...new Set(allItems.map(item => item.categorie))].sort((a, b) => {
    let indexA = order.indexOf(a);
    let indexB = order.indexOf(b);
    if(indexA === -1) indexA = 99;
    if(indexB === -1) indexB = 99;
    return indexA - indexB;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12 relative">
      <div className="flex justify-between items-end border-b border-red-200 pb-2 mb-6 print-hidden">
        <h2 className="text-2xl font-bold text-red-800">Turflijst Bar</h2>
        <button 
          type="button" 
          onClick={() => {
            try { window.print(); } catch(e) { console.error('Print blocked in iframe:', e); }
          }} 
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm flex gap-2 items-center hover:bg-gray-900 transition shadow"
        >
          <Printer size={16} /> Print / Maak PDF
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6 print-hidden">Tik op de grote knoppen om een item op te tellen of af te trekken.</p>
      
      {/* --- EDITOR WEERGAVE --- */}
      <div className="print-hidden">
        {categories.map(cat => (
          <div key={cat} className="space-y-3 mb-6">
            <h3 className="font-bold text-xl text-red-800 bg-red-50 inline-block px-3 py-1 rounded print-border border-red-100">{cat}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {allItems.filter(item => item.categorie === cat).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow print-border border-gray-200 flex flex-col items-center text-center relative">
                  <div className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                    € {Number(item.prijs).toFixed(2)}
                  </div>
                  <span className="font-bold text-gray-700 mb-4 mt-6 h-10 flex items-center justify-center leading-tight text-sm md:text-base">{item.naam}</span>
                  <div className="flex items-center gap-4 w-full justify-between">
                    <button 
                      type="button"
                      onClick={() => decrement(item.id)}
                      className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full text-2xl font-black text-gray-600 active:bg-gray-300 flex items-center justify-center transition"
                    >-</button>
                    <span className="text-3xl font-black text-red-700 w-12">{t[item.id] || 0}</span>
                    <button 
                      type="button"
                      onClick={() => increment(item.id)}
                      className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full text-2xl font-black active:bg-red-800 flex items-center justify-center shadow transition"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Extra Handmatige Items Toevoegen */}
        <div className="mt-8 bg-white p-4 rounded-lg shadow print-border border-gray-200">
          <h4 className="font-bold text-gray-700 mb-2">Speciaal verzoek of onbekend item?</h4>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 max-w-xl">
            <input 
              type="text" 
              placeholder="Naam knop (bijv. Fles Gin)" 
              className="border rounded p-2 flex-1 outline-none focus:border-red-700 text-sm"
              value={newCustomName}
              onChange={e => setNewCustomName(e.target.value)}
            />
            <input 
              type="number" 
              placeholder="Prijs incl. BTW (€)" 
              step="0.01"
              className="border rounded p-2 w-36 outline-none focus:border-red-700 text-sm"
              value={newCustomPrice}
              onChange={e => setNewCustomPrice(e.target.value)}
            />
            <button 
              type="button"
              onClick={addCustomItem}
              className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 transition flex items-center justify-center gap-1 font-semibold"
            >
              <Plus size={16} /> <span>Toevoegen</span>
            </button>
          </div>
        </div>

        {/* Administratie: Bulk Invoer */}
        <div className="mt-8 bg-yellow-50 p-4 rounded-lg shadow print-border border border-yellow-300 print-hidden">
          <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            <Settings size={18} /> Administratie: Bulk Invoer (Achteraf)
          </h4>
          <p className="text-xs text-yellow-700 mb-3">
            Voer in één keer een groot aantal in voor evenementen die al hebben plaatsgevonden. Het getal dat je hier invult <strong>overschrijft</strong> het huidige aantal.
          </p>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 max-w-3xl">
            <select 
              className="border border-yellow-400 rounded p-2 flex-1 outline-none focus:border-yellow-600 text-sm bg-white font-medium"
              value={bulkItemId}
              onChange={e => setBulkItemId(e.target.value)}
            >
              <option value="">-- Selecteer een drankje / item --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>{item.naam}</option>
              ))}
            </select>
            <input 
              type="number" 
              placeholder="Nieuw totaal (bijv. 135)" 
              className="border border-yellow-400 rounded p-2 w-48 outline-none focus:border-yellow-600 text-sm bg-white font-bold text-center"
              value={bulkAmount}
              onChange={e => setBulkAmount(e.target.value)}
            />
            <button 
              type="button"
              onClick={handleBulkUpdate}
              className="bg-yellow-600 text-white px-6 py-2 rounded text-sm hover:bg-yellow-700 transition flex items-center justify-center gap-2 font-bold shadow-sm"
            >
              <Save size={16} /> Toepassen
            </button>
          </div>
        </div>

        {/* Logboek & Schade Sectie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white p-4 rounded-lg shadow print-border border-gray-200">
            <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2"><Edit size={16} /> Logboek / Notities Barpersoneel</h4>
            <p className="text-xs text-gray-500 mb-2">Plaats hier bijzonderheden over het verloop van de avond of opmerkingen over betalingen.</p>
            <textarea 
              className="w-full border border-gray-300 rounded p-2 min-h-[100px] outline-none focus:border-red-700 text-sm"
              value={data.logboek || ''}
              onChange={(e) => updateField('logboek', e.target.value)}
              placeholder="Bijv. Vader van de bruid heeft zelf nog 2 rondjes contant betaald..."
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow print-border border-gray-200">
            <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2"><Trash2 size={16} /> Breuk & Schade Registratie</h4>
            <p className="text-xs text-gray-500 mb-2">Noteer hier gebroken glazen of eventuele schade die doorbelast moet worden.</p>
            <textarea 
              className="w-full border border-gray-300 rounded p-2 min-h-[100px] outline-none focus:border-red-700 text-sm"
              value={data.schade || ''}
              onChange={(e) => updateField('schade', e.target.value)}
              placeholder="Bijv. 3x bierglas gebroken, 1x statafel rok gescheurd..."
            />
          </div>
        </div>
      </div>

      {/* --- SPECIALE PRINT WEERGAVE (ALLEEN GETURFDE ITEMS) --- */}
      <div className="hidden print:block bg-white p-8">
        <h1 className="text-3xl font-bold mb-2">Overzicht Turflijst: {data.naam}</h1>
        <p className="text-lg mb-8">Datum: {data.datum || '-'}</p>

        <table className="w-full text-sm border-collapse mb-8">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border-b border-gray-300 w-16 text-center">Aantal</th>
              <th className="p-2 border-b border-gray-300">Item</th>
              <th className="p-2 border-b border-gray-300 text-right w-32">Prijs p/s</th>
              <th className="p-2 border-b border-gray-300 text-right w-32">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(t).filter(id => t[id] > 0).map(id => {
              const defItem = allItems.find(i => i.id === id);
              if(!defItem) return null;
              return (
                <tr key={id} className="border-b border-gray-100">
                  <td className="p-2 text-center font-black text-gray-900">{t[id]}</td>
                  <td className="p-2 font-semibold text-gray-800">{defItem.naam}</td>
                  <td className="p-2 text-right text-gray-600">€ {Number(defItem.prijs).toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">€ {(t[id] * defItem.prijs).toFixed(2)}</td>
                </tr>
              )
            })}
            {Object.keys(t).filter(id => t[id] > 0).length === 0 && (
              <tr><td colSpan="4" className="p-4 text-center italic text-gray-500">Er zijn geen items geturfd.</td></tr>
            )}
          </tbody>
        </table>

        {(data.logboek || data.schade) && (
          <div className="grid grid-cols-2 gap-8 print-break-inside-avoid">
            {data.logboek && (
              <div>
                <h4 className="font-bold text-red-800 border-b border-gray-300 pb-1 mb-2">Logboek / Notities</h4>
                <p className="text-sm whitespace-pre-wrap">{data.logboek}</p>
              </div>
            )}
            {data.schade && (
              <div>
                <h4 className="font-bold text-red-800 border-b border-gray-300 pb-1 mb-2">Breuk & Schade</h4>
                <p className="text-sm whitespace-pre-wrap">{data.schade}</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// TAB 4: DEBRIEFING
function TabDebriefing({ data, updateField }) {
  const d = data.debriefing || { goed: '', beter: '', tevreden: '', opmerkingen: '' };

  return (
    <div className="space-y-6 animate-in fade-in pb-12 max-w-4xl mx-auto">
      <div className="flex justify-between items-end border-b border-red-200 pb-2 mb-6 print-hidden">
        <h2 className="text-2xl font-bold text-red-800">Debriefing & Evaluatie</h2>
        <button 
          type="button" 
          onClick={() => {
            try { window.print(); } catch(e) { console.error('Print blocked in iframe:', e); }
          }} 
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm flex gap-2 items-center hover:bg-gray-900 transition shadow"
        >
          <Printer size={16} /> Print / Maak PDF
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6 print-hidden">
        Deze vragenlijst is bedoeld voor de Partymanager (FM) om na het sluiten van het evenement in te vullen. 
        Zo houden we de kwaliteit hoog en evalueren we elk feest netjes.
      </p>

      {/* Tittel speciaal voor print */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold">Debriefing: {data.naam}</h1>
        <p className="text-lg">Datum: {data.datum || '-'}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow print-border border-gray-200 space-y-6 print-break-inside-avoid">
        <div className="flex flex-col">
          <label className="font-bold text-gray-800 mb-2 text-lg">1. Wat ging er goed vanavond?</label>
          <textarea 
            className="w-full border border-gray-300 rounded p-3 min-h-[100px] outline-none focus:border-red-700 text-sm print-hidden bg-white"
            value={d.goed}
            onChange={(e) => updateField('debriefing.goed', e.target.value)}
            placeholder="Bijv. Samenwerking met Wapenaar verliep vlot, sfeer zat er goed in..."
          />
          <p className="hidden print:block text-sm whitespace-pre-wrap">{d.goed || '-'}</p>
        </div>

        <div className="flex flex-col border-t border-gray-100 pt-6">
          <label className="font-bold text-gray-800 mb-2 text-lg">2. Wat kon er beter?</label>
          <textarea 
            className="w-full border border-gray-300 rounded p-3 min-h-[100px] outline-none focus:border-red-700 text-sm print-hidden bg-white"
            value={d.beter}
            onChange={(e) => updateField('debriefing.beter', e.target.value)}
            placeholder="Bijv. Tekort aan pilsglazen halverwege de avond..."
          />
          <p className="hidden print:block text-sm whitespace-pre-wrap">{d.beter || '-'}</p>
        </div>

        <div className="flex flex-col border-t border-gray-100 pt-6">
          <label className="font-bold text-gray-800 mb-2 text-lg">3. Is de klant tevreden vertrokken?</label>
          <textarea 
            className="w-full border border-gray-300 rounded p-3 min-h-[80px] outline-none focus:border-red-700 text-sm print-hidden bg-white"
            value={d.tevreden}
            onChange={(e) => updateField('debriefing.tevreden', e.target.value)}
            placeholder="Korte toelichting over de reactie van de klant op de avond..."
          />
          <p className="hidden print:block text-sm whitespace-pre-wrap">{d.tevreden || '-'}</p>
        </div>

        <div className="flex flex-col border-t border-gray-100 pt-6">
          <label className="font-bold text-gray-800 mb-2 text-lg">4. Overige opmerkingen voor administratie/planning</label>
          <textarea 
            className="w-full border border-gray-300 rounded p-3 min-h-[80px] outline-none focus:border-red-700 text-sm print-hidden bg-white"
            value={d.opmerkingen}
            onChange={(e) => updateField('debriefing.opmerkingen', e.target.value)}
            placeholder="Bijv. Denk aan het factureren van de 3 gebroken glazen..."
          />
          <p className="hidden print:block text-sm whitespace-pre-wrap">{d.opmerkingen || '-'}</p>
        </div>
      </div>
    </div>
  );
}

// TAB 5: FACTUUR
function TabFactuur({ data }) {
  const calcTotaal = (row) => (Number(row.aantal) || 1) * (Number(row.uren) || 1) * (Number(row.tarief || row.prijs) || 0);
  
  let totaalIncl = 0;
  let btw9Bedrag = 0;
  let btw21Bedrag = 0;

  // 1. Bereken Originele Offerte Totaal (Voor de Interne Controle)
  let origineleOfferteTotaal = 0;
  data.offerte.forEach(row => {
    origineleOfferteTotaal += calcTotaal(row);
  });

  const processItemForTotals = (totIncl, btwFactor) => {
    totaalIncl += totIncl;
    if (btwFactor === 9) {
      btw9Bedrag += totIncl - (totIncl / 1.09);
    } else if (btwFactor === 21) {
      btw21Bedrag += totIncl - (totIncl / 1.21);
    }
  };

  // 2. Offerte totalen voor op de Factuur (Alleen items met vinkje `inFactuur` aan)
  const factuurOfferteItems = data.offerte.filter(row => row.inFactuur !== false);
  factuurOfferteItems.forEach(row => {
    const tot = calcTotaal(row);
    processItemForTotals(tot, Number(row.btw));
  });

  // 3. Turflijst totalen (Inclusief Custom extra items)
  const allTurfItems = [...DEFAULT_TURF_ITEMS, ...(data.extraTurfItems || [])];
  const turfItemsList = [];
  
  Object.keys(data.turflijst || {}).forEach(id => {
    const count = data.turflijst[id];
    if (count > 0) {
      const defItem = allTurfItems.find(i => i.id === id);
      if (defItem) {
        const rowTotal = count * defItem.prijs;
        turfItemsList.push({ naam: defItem.naam, aantal: count, prijs: defItem.prijs, totaal: rowTotal, btw: defItem.btw });
        processItemForTotals(rowTotal, Number(defItem.btw));
      }
    }
  });

  const totaalEx = totaalIncl - btw9Bedrag - btw21Bedrag;
  
  // Bereken openstaand bedrag op basis van aanbetaling
  const aanbetaling = Number(data.aanbetaling) || 0;
  const nogTeVoldoen = totaalIncl - aanbetaling;

  // Stoplicht logica voor Interne Controle
  const afwijkingBedrag = Math.abs(totaalIncl - origineleOfferteTotaal);
  const afwijkingPercentage = origineleOfferteTotaal > 0 ? (afwijkingBedrag / origineleOfferteTotaal) * 100 : 0;
  
  let statusKleur = "bg-green-50 border-green-200 text-green-800";
  let statusIcon = <CheckCircle className="text-green-600" size={24} />;
  let statusTekst = "Afwijking lijkt normaal (<10%)";

  if (afwijkingPercentage >= 25) {
    statusKleur = "bg-red-50 border-red-300 text-red-900";
    statusIcon = <AlertTriangle className="text-red-600" size={24} />;
    statusTekst = "Grote afwijking! Controleer turflijst op typefouten (>25%)";
  } else if (afwijkingPercentage >= 10) {
    statusKleur = "bg-yellow-50 border-yellow-300 text-yellow-900";
    statusIcon = <AlertTriangle className="text-yellow-600" size={24} />;
    statusTekst = "Opvallende afwijking, werp een extra blik (10% - 25%)";
  }

  // Genereer UBL XML voor Exact Online
  const generateUBL = () => {
    const dateToday = new Date().toISOString().split('T')[0];
    const factuurNummer = `FACTUUR-${data.id.slice(-6)}`;
    const klantNaam = data.briefing.bedrijfsnaam || data.briefing.contactKlant || 'Onbekende Klant';

    const ublString = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0</cbc:CustomizationID>
  <cbc:ID>${factuurNummer}</cbc:ID>
  <cbc:IssueDate>${dateToday}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Brouwerij Vulcaan</cac:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Oosthavenkade</cbc:StreetName>
        <cbc:BuildingNumber>90/92</cbc:BuildingNumber>
        <cbc:CityName>Vlaardingen</cbc:CityName>
        <cbc:PostalZone>3134 KA</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>NL</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>89387260</cbc:CompanyID>
        <cbc:TaxID>NL864965497B01</cbc:TaxID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${klantNaam}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cac:PayeeFinancialAccount>
      <cbc:ID>NL54 ABNA 0124 0244 67</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="EUR">${totaalEx.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${totaalIncl.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PrepaidAmount currencyID="EUR">${aanbetaling.toFixed(2)}</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="EUR">${nogTeVoldoen.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const blob = new Blob([ublString], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${factuurNummer}_UBL.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto pb-10">
      
      {/* Verborgen tijdens printen: Stoplicht / Sanity Check */}
      <div className={`print-hidden border rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm ${statusKleur}`}>
        {statusIcon}
        <div className="flex-1">
          <h3 className="font-bold text-lg">Interne Controle: Offerte vs. Factuur</h3>
          <p className="text-sm">
            Originele Offerte: <strong>€ {origineleOfferteTotaal.toFixed(2)}</strong> | 
            Huidige Factuur: <strong>€ {totaalIncl.toFixed(2)}</strong> 
            <span className="ml-2 font-medium opacity-80">(Verschil: € {afwijkingBedrag.toFixed(2)})</span>
          </p>
        </div>
        <div className="bg-white/50 px-3 py-1 rounded font-bold border border-black/10">
          {statusTekst}
        </div>
      </div>

      <div className="flex justify-between items-end border-b border-red-200 pb-2 mb-6 print-hidden">
        <h2 className="text-2xl font-bold text-red-800">Concept Factuur</h2>
        <div className="flex gap-2">
          <button onClick={generateUBL} className="bg-blue-600 text-white px-4 py-2 rounded text-sm flex gap-2 items-center hover:bg-blue-700 transition shadow">
            <FileCode size={16} /> UBL Factuur Genereren
          </button>
          <button 
            type="button" 
            onClick={() => {
              try { window.print(); } catch(e) { console.error('Print blocked in iframe:', e); }
            }} 
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm flex gap-2 items-center hover:bg-gray-900 transition shadow"
          >
            <Printer size={16} /> Print / Maak PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow print-border" id="printable-invoice">
        <div className="flex justify-between mb-8">
          <div>
            <img 
              src="https://vulcaanbier.nl/Portals/2/Afbeeldingen/logo_pagelayout.png?ver=1y2YvKCvJSpqot8lBNhjog%3D%3D" 
              alt="Vulcaan Logo" 
              className="h-16 mb-2 object-contain" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <p className="text-sm text-gray-500 font-semibold">Oosthavenkade 90/92<br/>3134 KA Vlaardingen</p>
            <p className="text-xs text-gray-400 mt-2">
              KVK: 89387260<br/>
              BTW: NL864965497B01<br/>
              IBAN: NL54 ABNA 0124 0244 67
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-red-800 uppercase tracking-widest mb-4">Factuur</h1>
            {data.briefing.bedrijfsnaam && <h3 className="font-bold text-lg text-gray-900">{data.briefing.bedrijfsnaam}</h3>}
            <h3 className={data.briefing.bedrijfsnaam ? "font-medium text-gray-700" : "font-bold text-lg text-gray-900"}>
              T.a.v. {data.briefing.contactKlant}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {data.briefing.adresKlant}<br/>
              {data.briefing.postcodeKlant} {data.briefing.woonplaatsKlant}
            </p>
            <p className="text-sm text-gray-600 mt-1">{data.briefing.emailKlant}</p>
            
            <div className="text-sm text-gray-600 mt-4 border-t pt-2">
              <p><strong>Evenement:</strong> {data.naam}</p>
              <p><strong>Datum:</strong> {data.datum}</p>
              {data.briefing.referentieNummer && <p><strong>Uw ref:</strong> {data.briefing.referentieNummer}</p>}
            </div>
          </div>
        </div>

        {/* Vaste kosten */}
        {factuurOfferteItems.length > 0 && (
          <div className="print-break-inside-avoid">
            <h4 className="font-bold border-b border-gray-300 pb-1 mb-2 mt-6 text-red-800">Vaste kosten (volgens offerte)</h4>
            <table className="w-full text-sm mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left border-b border-gray-300 w-16 text-center">Aantal</th>
                  <th className="p-2 text-left border-b border-gray-300">Omschrijving</th>
                  <th className="p-2 text-left border-b border-gray-300 w-16 text-center">Aantal</th>
                  <th className="p-2 text-right border-b border-gray-300 w-32">Tarief (incl BTW)</th>
                  <th className="p-2 text-right border-b border-gray-300 w-32">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {factuurOfferteItems.map(row => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="p-2 text-center text-gray-600">{row.aantal || 1}</td>
                    <td className="p-2 text-gray-800 font-semibold">{row.dienst}</td>
                    <td className="p-2 text-center text-gray-600">{row.uren || 1}</td>
                    <td className="p-2 text-right text-gray-600">€ {Number(row.tarief).toFixed(2)}</td>
                    <td className="p-2 text-right text-gray-950 font-bold">€ {calcTotaal(row).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Nacalculatie Turflijst */}
        {turfItemsList.length > 0 && (
          <div className="print-break-inside-avoid">
            <h4 className="font-bold border-b border-gray-300 pb-1 mb-2 mt-6 text-red-800">Nacalculatie (Turflijst Bar)</h4>
            <table className="w-full text-sm mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left border-b border-gray-300 w-16 text-center">Aantal</th>
                  <th className="p-2 text-left border-b border-gray-300">Omschrijving</th>
                  <th className="p-2 text-left border-b border-gray-300 w-16 text-center">-</th>
                  <th className="p-2 text-right border-b border-gray-300 w-32">Prijs p/s (incl BTW)</th>
                  <th className="p-2 text-right border-b border-gray-300 w-32">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {turfItemsList.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="p-2 text-center text-gray-950 font-black">{item.aantal}</td>
                    <td className="p-2 text-gray-800 font-semibold">{item.naam}</td>
                    <td className="p-2 text-center text-gray-600">-</td>
                    <td className="p-2 text-right text-gray-600">€ {Number(item.prijs).toFixed(2)}</td>
                    <td className="p-2 text-right text-gray-950 font-bold">€ {Number(item.totaal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totalen Berekeningen */}
        <div className="w-full flex justify-end mt-8 print-break-inside-avoid">
          <div className="w-72 space-y-2 text-sm border-t-2 border-gray-800 pt-4">
            <div className="flex justify-between text-lg font-black text-red-800 border-b border-gray-300 pb-2 mb-2">
              <span>Totaal incl. BTW:</span>
              <span>€ {totaalIncl.toFixed(2)}</span>
            </div>
            {btw9Bedrag > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Waarin begrepen 9% BTW:</span>
                <span>€ {btw9Bedrag.toFixed(2)}</span>
              </div>
            )}
            {btw21Bedrag > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Waarin begrepen 21% BTW:</span>
                <span>€ {btw21Bedrag.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-semibold pt-2 mt-2 border-t border-gray-200">
              <span>Totaal excl. BTW:</span>
              <span>€ {totaalEx.toFixed(2)}</span>
            </div>
            
            {/* Aanbetaling & Eindbedrag Weergave */}
            {aanbetaling > 0 && (
              <>
                <div className="flex justify-between text-gray-600 font-semibold pt-1">
                  <span>Reeds voldaan (Aanbetaling):</span>
                  <span>- € {aanbetaling.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xl border-t-2 border-red-700 pt-3 mt-2 text-red-800">
                  <span>Te voldoen:</span>
                  <span>€ {nogTeVoldoen.toFixed(2)}</span>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

// --- UTILITY COMPONENTS ---

function Input({ label, type = "text", value, onChange, placeholder = '' }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input 
        type={type} 
        className="border border-gray-300 rounded p-2 focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none transition text-sm bg-white"
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
      />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <textarea 
        className="border border-gray-300 rounded p-2 min-h-[80px] focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none transition text-sm bg-white"
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  );
}

// Speciale component voor de halve-uur intervallen (00 of 30)
function TimeSelect({ value, onChange, className = '' }) {
  const times = [];
  for (let h = 0; h < 24; h++) {
    const hh = h.toString().padStart(2, '0');
    times.push(`${hh}:00`, `${hh}:30`);
  }
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-gray-300 rounded p-2 focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none transition text-sm bg-white ${className}`}
    >
      <option value="" disabled>--:--</option>
      {times.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

function TimeInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <TimeSelect value={value} onChange={onChange} />
    </div>
  );
}
