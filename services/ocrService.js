import TextRecognition from '@react-native-ml-kit/text-recognition';

export const extractSecuNumber = async (imageUri) => {
  try {
    const result = await TextRecognition.recognize(imageUri);
    
    // On travaille sur les "blocs" de texte détectés par l'IA
    // C'est plus fiable que le texte brut global
    const blocks = result.blocks;

    if (blocks.length === 0) return null;

    // On parcourt chaque bloc de texte trouvé sur la carte
    for (let block of blocks) {
      // Pour chaque ligne dans le bloc
      for (let line of block.lines) {
        const rawLine = line.text;

        // 1. NETTOYAGE AGRESSIF
        // On remplace les lettres qui ressemblent à des chiffres
        const correctedLine = rawLine
          .toUpperCase()
          .replace(/O/g, '0')
          .replace(/Q/g, '0')
          .replace(/D/g, '0')
          .replace(/B/g, '8')
          .replace(/S/g, '5')
          .replace(/Z/g, '2')
          .replace(/I/g, '1')
          .replace(/L/g, '1');

        // 2. ON GARDE UNIQUEMENT LES CHIFFRES
        // On vire les espaces, les points, les tirets... tout !
        // Exemple : "2  55  01  57" devient "2550157"
        const digitsOnly = correctedLine.replace(/[^0-9]/g, '');

        // 3. ANALYSE DU RÉSULTAT
        // Un numéro de sécu commence par 1 ou 2
        // Et il fait 13 chiffres (sans la clé) ou 15 chiffres (avec la clé)
        
        // Cas parfait : On a trouvé la ligne complète
        if ((digitsOnly.length === 13 || digitsOnly.length === 15) && (digitsOnly.startsWith('1') || digitsOnly.startsWith('2'))) {
           // On renvoie toujours les 13 premiers (format standard Ameli)
           return digitsOnly.substring(0, 13);
        }

        // Cas difficile (image coupée ou bruit) :
        // Parfois le scanner ajoute des chiffres parasites avant ou après
        // On cherche une séquence de 13 chiffres commençant par 1 ou 2 à l'intérieur
        if (digitsOnly.length > 13) {
           const match = digitsOnly.match(/[12]\d{12}/);
           if (match) {
             return match[0];
           }
        }
      }
    }

    // SI RIEN TROUVÉ LIGNE PAR LIGNE
    // On tente une approche désespérée : on colle tout le texte de la carte
    // et on cherche dedans (utile si le numéro est coupé sur 2 lignes par l'OCR)
    const fullTextDigits = result.text.replace(/[^0-9]/g, '');
    const fullMatch = fullTextDigits.match(/[12]\d{12}/);
    
    if (fullMatch) {
      return fullMatch[0];
    }

    return null;

  } catch (error) {
    console.error("Erreur OCR:", error);
    return null;
  }
};