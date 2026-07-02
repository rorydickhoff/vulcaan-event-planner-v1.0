// ... existing code ...
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, FileText, Beer, Receipt, 
  Plus, Trash2, ChevronLeft, Save, CheckCircle, Edit,
  Printer, MessageSquare, CheckSquare, Paperclip, FileCode, LogOut, Settings,
  AlertTriangle, Info
} from 'lucide-react';

// --- FIREBASE IMPORTS (CLOUD DATABASE & AUTH) ---
// ... existing code ...
// TAB 5: FACTUUR
function TabFactuur({ data }) {
  const calcTotaal = (row) => (Number(row.aantal) || 1) * (Number(row.uren) || 1) * (Number(row.tarief || row.prijs) || 0);
  
  let totaalIncl = 0;
  let btw9Bedrag = 0;
  let btw21Bedrag = 0;

  const processItemForTotals = (totIncl, btwFactor) => {
    totaalIncl += totIncl;
    if (btwFactor === 9) {
      btw9Bedrag += totIncl - (totIncl / 1.09);
    } else if (btwFactor === 21) {
      btw21Bedrag += totIncl - (totIncl / 1.21);
    }
  };

  // 1. Offerte totalen (Alleen items met vinkje `inFactuur` aan)
  const factuurOfferteItems = data.offerte.filter(row => row.inFactuur !== false);
  factuurOfferteItems.forEach(row => {
    const tot = calcTotaal(row);
    processItemForTotals(tot, Number(row.btw));
  });

  // 1b. Totaal originele raming berekenen (voor de interne controle)
  let offerteTotaalIncl = 0;
  data.offerte.forEach(row => {
    offerteTotaalIncl += calcTotaal(row);
  });

  // 2. Turflijst totalen (Inclusief Custom extra items)
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

  // Interne Controle Berekeningen
  const verschilBedrag = totaalIncl - offerteTotaalIncl;
  const verschilPercentage = offerteTotaalIncl > 0 ? (verschilBedrag / offerteTotaalIncl) * 100 : 0;
  const absVerschilPerc = Math.abs(verschilPercentage);
  const isMeer = verschilBedrag > 0;

  // Bepaal kleur en tekst van de controle
  let controleColor = 'bg-green-50 border-green-300 text-green-900';
  let controleIcon = <CheckCircle size={24} className="text-green-600" />;
  let controleTekst = "Het verschil met de originele offerte valt binnen de normale marges van nacalculatie.";

  if (absVerschilPerc > 25) {
    controleColor = 'bg-red-50 border-red-300 text-red-900';
    controleIcon = <AlertTriangle size={24} className="text-red-600" />;
    controleTekst = "Let op: Het factuurbedrag wijkt zeer sterk af van de offerte (>25%). Controleer of er geen typefouten in de turflijst of uren zijn geslopen.";
  } else if (absVerschilPerc > 10) {
    controleColor = 'bg-yellow-50 border-yellow-300 text-yellow-900';
    controleIcon = <Info size={24} className="text-yellow-600" />;
    controleTekst = "Het factuurbedrag wijkt wat af van de offerte. Bij nacalculatie is dit mogelijk, maar een snelle check kan geen kwaad.";
  }

  // Genereer UBL XML voor Exact Online
// ... existing code ...
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto pb-10">
      
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

      {/* --- INTERNE CONTROLE BLOK (Alleen zichtbaar op scherm) --- */}
      <div className={`print-hidden rounded-lg border-2 p-4 mb-8 shadow-sm flex items-start gap-4 ${controleColor}`}>
        <div className="mt-1">{controleIcon}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Interne Controle: Raming vs. Nacalculatie</h3>
          <p className="text-sm font-medium mb-3 opacity-90">{controleTekst}</p>
          
          <div className="grid grid-cols-3 gap-4 bg-white/60 p-3 rounded border border-black/5">
            <div>
              <p className="text-xs uppercase font-bold opacity-70">Originele Offerte</p>
              <p className="font-bold text-lg">€ {offerteTotaalIncl.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold opacity-70">Huidige Factuur</p>
              <p className="font-bold text-lg">€ {totaalIncl.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-bold opacity-70">Verschil</p>
              <p className={`font-black text-lg ${absVerschilPerc > 25 ? 'text-red-700' : ''}`}>
                {isMeer ? '+' : ''} € {verschilBedrag.toFixed(2)} ({isMeer ? '+' : ''}{verschilPercentage.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow print-border" id="printable-invoice">
        <div className="flex justify-between mb-8">
// ... existing code ...
