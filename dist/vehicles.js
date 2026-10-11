'use strict';
(function(root){
 const info=[['Campanello','Suona per salutare i cittadini. Perfetta per le stradine del quartiere.'],['Faro della moto','Illumina la scena: al molo gli indizi si vedono meglio.'],['Sirena della pattuglia','Accendi i lampeggianti e annuncia l’arrivo di Pippo.'],['Partenza sprint','Spostamenti più rapidi per le missioni fuori quartiere.'],['Vano dei pacchi','Carica i pacchi ordinati e consegnali al festival.'],['Rotore e radar','Raggiunge il faro isolato e sorvola la costa.']];
 function svg(index){
  if(!Number.isInteger(index)||index<0||index>5)throw new RangeError('Unknown vehicle');
  const lights=index===2||index===3?'<circle class="siren-red" cx="77" cy="24" r="2.5" fill="#ff6857"/><circle class="siren-blue" cx="72" cy="24" r="2.5" fill="#80d8ff"/>':'';
  const rotor=index===5?'<path class="rotor" d="M21 13h124" stroke="#e6d5ad" stroke-width="2"/>':'';
  return root.PippoArt.sprite('assets/vehicles.png',index,3,2,160,96,lights+rotor);
 }
 root.PortoVehicles={info,svg};
})(globalThis);
