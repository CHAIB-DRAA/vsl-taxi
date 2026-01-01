import TextRecognition from '@react-native-ml-kit/text-recognition';

export const extractSecuNumber = async (imageUri) => {
  try {
    const result = await TextRecognition.recognize(imageUri);
    const text = result.text;

    // REGEX PUISSANTE POUR LE NIR
    // Cherche 13 ou 15 chiffres, commençant par 1 ou 2, avec ou sans espaces
    const nirRegex = /[12][\s\.]?(\d{2}[\s\.]?){5}\d{2}([\s\.]?\d{2})?/g;
    
    const match = text.match(nirRegex);

    if (match && match.length > 0) {
      // On prend le premier résultat et on nettoie les espaces/points
      const cleanNIR = match[0].replace(/[\s\.]/g, '');
      
      // On garde les 13 premiers chiffres (AmeliPro demande souvent le NIR 13 sans la clé, ou 15)
      return cleanNIR; 
    }
    return null;
  } catch (error) {
    console.error("Erreur OCR:", error);
    return null;
  }
};