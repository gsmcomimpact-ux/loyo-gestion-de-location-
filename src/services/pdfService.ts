import jsPDF from 'jspdf';
import { Paiement, Bail, Logement, Bien, Locataire, Proprietaire } from '../types';
import { formatMoney, formatDate, getMonthName, montantEnLettres, formatPhoneNumber } from '../utils/formatters';
import { createDigitalCertificate, CertificateData } from './certificateService';

/**
 * Génération du PDF officiel de la Fiche de Quittance de Loyer
 * Titre épuré universel pour l'espace francophone, avec mise en valeur forte du locataire
 */
export async function generateQuittancePDF(
  paiement: Paiement,
  bail: Bail,
  logement: Logement,
  bien: Bien,
  locataire: Locataire,
  proprietaire: Proprietaire,
  providedCert?: CertificateData,
  currency: string = 'FCFA'
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Format standard A5 officiel
  });

  // Obtenir ou générer le certificat numérique avec QR code
  const cert = providedCert || (await createDigitalCertificate(paiement, logement, locataire, proprietaire));
  paiement.certificatId = cert.certificatId;
  paiement.signatureNumerique = cert.signatureNumerique;
  paiement.dateCertification = cert.dateCertification;

  // Liseré supérieur épuré & professionnel (Vert émeraude)
  doc.setFillColor(13, 92, 58);
  doc.rect(0, 0, 148, 3, 'F');

  // Titre principal épuré (conformément à la demande : sans en-tête d'État, juste le titre)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(13, 92, 58);
  doc.text('FICHE DE QUITTANCE DE LOYER', 74, 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Reçu et décharge libératoire de loyer · Document certifié conforme', 74, 16.5, { align: 'center' });

  // Numéro de Quittance, Locataire et Date
  doc.setDrawColor(13, 92, 58);
  doc.setLineWidth(0.4);
  doc.setFillColor(243, 249, 245);
  doc.roundedRect(12, 20.5, 124, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(13, 92, 58);
  doc.text(`QUITTANCE N° ${paiement.numeroQuittance}`, 16, 25.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(`Délivrée le : ${formatDate(paiement.date)} à ${bien.ville || 'Dakar'}`, 132, 25.5, { align: 'right' });

  // Mention très visible du Locataire dans l'en-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 65, 40);
  doc.text(`LOCATAIRE BÉNÉFICIAIRE : ${locataire.nom.toUpperCase()} (${formatPhoneNumber(locataire.telephone)})`, 16, 29);

  // Double cartouche : Bailleur & Locataire
  // Cartouche Bailleur (Gauche)
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(12, 33, 60, 25, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(13, 92, 58);
  doc.text('BAILLEUR (PROPRIÉTAIRE)', 15, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(proprietaire.nom, 15, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(`Tél : ${formatPhoneNumber(proprietaire.telephone)}`, 15, 48);
  doc.text(`Ville : ${proprietaire.ville || 'Dakar'}`, 15, 53);

  // Cartouche Locataire (Droite) - Mise en valeur renforcée
  doc.setDrawColor(13, 92, 58);
  doc.setLineWidth(0.4);
  doc.setFillColor(242, 250, 245);
  doc.roundedRect(76, 33, 60, 25, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(13, 92, 58);
  doc.text('LOCATAIRE (PRENEUR)', 79, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(10, 45, 25);
  doc.text(locataire.nom.toUpperCase(), 79, 43.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 70, 65);
  doc.text(`Tél : ${formatPhoneNumber(locataire.telephone)}`, 79, 48.5);
  doc.text(`Échéance convenue : Le ${locataire.jourEcheance} du mois`, 79, 53.5);

  // Cartouche Désignation du Logement
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(180, 205, 190);
  doc.setLineWidth(0.2);
  doc.roundedRect(12, 60.5, 124, 16.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(13, 92, 58);
  doc.text('DÉSIGNATION DU LOGEMENT LOUÉ :', 16, 64.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(`${logement.libelle} (Type : ${logement.type})`, 16, 69.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(`Immeuble / Concession : ${bien.nom} · ${bien.adresse}, ${bien.commune}, ${bien.ville}`, 16, 73.5);

  // Tableau du Décompte Financier
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);

  // Entête du tableau
  doc.setFillColor(235, 240, 236);
  doc.rect(12, 79, 124, 6.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(13, 92, 58);
  doc.text('DÉSIGNATION DES SOMMES', 16, 83.5);
  doc.text('PÉRIODE CONCERNÉE', 75, 83.5);
  doc.text('MONTANT', 132, 83.5, { align: 'right' });

  // Lignes du tableau
  doc.setFillColor(255, 255, 255);
  doc.rect(12, 85.5, 124, 17, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);

  // Ligne 1 : Loyer principal
  doc.text(`Loyer principal mensuel nu (${logement.type})`, 16, 90);
  doc.text(`Du 01 au 31 ${getMonthName(paiement.periodeMois)} ${paiement.periodeAnnee}`, 75, 90);
  doc.text(formatMoney(paiement.montant, currency), 132, 90, { align: 'right' });

  // Ligne 2 : Charges locatives
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text('Charges locatives / entretien commun', 16, 95);
  doc.text('Incluses / Sans supplément', 75, 95);
  doc.text(`0 ${currency}`, 132, 95, { align: 'right' });

  // Ligne 3 : Total encaissé
  doc.setFillColor(242, 248, 244);
  doc.rect(12, 97.5, 124, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(13, 92, 58);
  doc.text('TOTAL ENCAISSÉ :', 16, 102);
  doc.text(formatMoney(paiement.montant, currency), 132, 102, { align: 'right' });

  // Montant en toutes lettres & Déclaration légale avec nom du Locataire
  doc.setFillColor(252, 252, 250);
  doc.setDrawColor(210, 210, 200);
  doc.roundedRect(12, 106.5, 124, 11.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(`DÉCLARATION LÉGALE POUR LE LOCATAIRE ${locataire.nom.toUpperCase()} :`, 15, 110);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(13, 92, 58);
  const lettresTexte = montantEnLettres(paiement.montant, currency);
  doc.text(`« ${lettresTexte} »`, 15, 115);

  // Modalités de paiement & Solde
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`Mode de règlement : ${paiement.mode.toUpperCase()}${paiement.referenceTransaction ? ` (Réf : ${paiement.referenceTransaction})` : ''}`, 15, 121);
  doc.text(`Encaissé par : ${paiement.enregistreParNom} (${paiement.enregistreParRole})`, 75, 121);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 92, 58);
  doc.text(`Solde dû : 0 ${currency} (Soldé)`, 132, 121, { align: 'right' });

  // Clause légale officielle
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(110, 110, 110);
  doc.text(
    'Le paiement de la présente quittance n\'emporte pas renonciation aux loyers antérieurs qui demeureraient impayés.',
    74,
    125.5,
    { align: 'center' }
  );
  doc.text(
    'Délivrée sous réserve d\'encaissement et de tous droits et actions. Annule tous reçus d\'acompte antérieurs pour cette même période.',
    74,
    128,
    { align: 'center' }
  );

  // --- BLOC BAS : CERTIFICAT NUMÉRIQUE UNIQUE (GAUCHE) & CACHET / SIGNATURE (DROITE) ---
  // Cadre Certificat Numérique
  doc.setFillColor(250, 252, 250);
  doc.setDrawColor(13, 92, 58);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 131, 72, 58, 1.5, 1.5, 'FD');

  // Titre Certificat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(13, 92, 58);
  doc.text('CERTIFICAT NUMÉRIQUE UNIQUE', 16, 136.5);

  // Image QR Code insérée dans le PDF (format net de 24 x 24 mm)
  if (cert.qrDataUrl) {
    doc.addImage(cert.qrDataUrl, 'PNG', 15, 139, 24, 24);
  }

  // Métadonnées à côté du QR
  doc.setFontSize(6.5);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text('ID Certificat :', 42, 143);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(cert.certificatId, 42, 147);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Empreinte SHA-256 :', 42, 153);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(`${cert.signatureNumerique.slice(0, 18)}...`, 42, 157);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Statut Intégrité :', 42, 163);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Vérifié & Immuable', 42, 167);

  // Instruction de vérification
  doc.setFontSize(5.5);
  doc.setTextColor(13, 92, 58);
  doc.setFont('helvetica', 'bold');
  doc.text('Scanner pour vérifier l\'authenticité officielle', 16, 169.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Opposable auprès des autorités administratives, communales et fiscales.', 16, 173.5);
  doc.text('Vérifiable en ligne sur loyo.app/?verify=' + encodeURIComponent(cert.certificatId), 16, 177);

  // Cadre Signature & Cachet (Droite)
  doc.setDrawColor(190, 190, 190);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(88, 131, 48, 58, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Cachet & Visa du Bailleur :', 91, 136.5);

  // Tampon certifié rectangulaire
  doc.setDrawColor(13, 92, 58);
  doc.setFillColor(243, 249, 245);
  doc.roundedRect(92, 141, 40, 28, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(13, 92, 58);
  doc.setFont('helvetica', 'bold');
  doc.text('Loyo', 112, 148, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  doc.text('RÉGIE LOCATIVE CERTIFIÉE', 112, 153, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(13, 92, 58);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFIÉ PAYÉ', 112, 159, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Le ${formatDate(paiement.date)}`, 112, 164, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'italic');
  doc.text(`Fait à ${bien.ville || 'Dakar'}`, 112, 173, { align: 'center' });
  doc.text('Signature autorisée', 112, 177, { align: 'center' });

  // Ligne de pied de page officiel
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Fiche de Quittance officielle émise pour M./Mme ${locataire.nom} · Loyo · Certificat ID : ${cert.certificatId}`,
    74,
    196,
    { align: 'center' }
  );

  return doc;
}

/**
 * Génération du formulaire officiel de Déclaration ou Contrat de Bail
 * Adapté à l'espace francophone
 */
export function generateDeclarationBailPDF(
  bail: Bail,
  logement: Logement,
  bien: Bien,
  locataire: Locataire,
  proprietaire: Proprietaire,
  currency: string = 'FCFA'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Titre du document épuré (sans mention république spécifique)
  doc.setFillColor(13, 92, 58);
  doc.rect(20, 18, 170, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('DÉCLARATION & CONTRAT DE BAIL À USAGE D\'HABITATION', 105, 28, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'italic');
  doc.text(`Ville : ${bien.ville.toUpperCase()} — Commune / Arrondissement : ${bien.commune.toUpperCase()}`, 105, 40, { align: 'center' });
  doc.text('Document officiel d\'enregistrement locatif et de preuve contractuelle', 105, 45, { align: 'center' });

  // Cadre 1 : Bailleur / Propriétaire
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 92, 58);
  doc.text('I. IDENTIFICATION DU BAILLEUR (PROPRIÉTAIRE)', 20, y);
  doc.line(20, y + 2, 190, y + 2);

  y += 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Nom et Prénom(s) :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(proprietaire.nom, 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Téléphone / Contact :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(proprietaire.telephone, 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Ville de résidence :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(proprietaire.ville, 75, y);

  // Cadre 2 : Locataire
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 92, 58);
  doc.text('II. IDENTIFICATION DU PRENEUR (LOCATAIRE)', 20, y);
  doc.line(20, y + 2, 190, y + 2);

  y += 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Nom et Prénom(s) :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(locataire.nom, 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Téléphone :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(locataire.telephone, 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date de prise d\'effet :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(bail.dateDebut), 75, y);

  // Cadre 3 : Désignation de l'immeuble et du logement
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 92, 58);
  doc.text('III. SITUATION ET CARACTÉRISTIQUES DU LOGEMENT', 20, y);
  doc.line(20, y + 2, 190, y + 2);

  y += 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Immeuble / Parcelle :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(bien.nom, 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Adresse exacte :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${bien.adresse}, ${bien.commune}, ${bien.ville}`, 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Type de logement :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${logement.libelle} — Typologie : ${logement.type}`, 75, y);

  // Cadre 4 : Conditions financières du bail
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 92, 58);
  doc.text('IV. CONDITIONS FINANCIÈRES DU BAIL', 20, y);
  doc.line(20, y + 2, 190, y + 2);

  y += 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Loyer mensuel convenu :', 25, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 92, 58);
  doc.text(formatMoney(bail.loyer, currency), 75, y);

  y += 6;
  doc.setTextColor(40, 40, 40);
  doc.text('Dépôt de garantie (Caution) :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatMoney(bail.cautionVersee, currency), 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Avance de loyer versée :', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatMoney(bail.avanceVersee, currency), 75, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date limite légale de déclaration :', 25, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 50, 20);
  doc.text(`${formatDate(bail.dateLimiteDeclaration)} (Délai légal de 3 mois)`, 75, y);

  // Cadre d'enregistrement administratif
  y += 15;
  doc.setDrawColor(150, 150, 150);
  doc.rect(20, y, 170, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('CADRE RÉSERVÉ AUX SERVICES ADMINISTRATIFS / MAIRIE', 25, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Date de réception au guichet : ..............................................', 25, y + 14);
  doc.text('Numéro d\'enregistrement au registre : ..........................................', 25, y + 21);
  doc.text('Nom et visa de l\'agent réceptionnaire : ............................................', 25, y + 28);
  doc.text('Cachet officiel :', 135, y + 14);

  // Signatures des parties
  y += 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Signature du Bailleur :', 35, y);
  doc.text('Signature du Preneur (Locataire) :', 125, y);

  y += 24;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Fait à ${bien.ville}, le ${new Date().toLocaleDateString('fr-FR')}. Déclaration préparée avec Loyo.`,
    105,
    y,
    { align: 'center' }
  );

  return doc;
}
