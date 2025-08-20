const addContact = async () => {
  if (!newEmail || !newEmail.trim()) {
    Alert.alert('Erreur', 'Veuillez entrer un email.');
    return;
  }

  try {
    const email = newEmail.trim();

    // Vérifier si l’utilisateur existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      Alert.alert('Utilisateur introuvable', 'Aucun utilisateur avec cet email.');
      return;
    }

    // Interdire d'ajouter soi-même
    if (profile.id === userId) {
      Alert.alert('Erreur', 'Vous ne pouvez pas vous ajouter vous-même.');
      return;
    }

    // Vérifier si le contact existe déjà
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_id', profile.id)
      .single();

    if (existing) {
      Alert.alert('Contact existant', 'Ce contact est déjà ajouté.');
      return;
    }

    // Ajouter le contact
    const { error: insertError } = await supabase
      .from('contacts')
      .insert({ user_id: userId, contact_id: profile.id });

    if (insertError) throw insertError;

    // Mise à jour locale immédiate
    setContacts(prev => [...prev, profile]);
    setNewEmail('');
    Alert.alert('Succès', `Contact ${profile.full_name || profile.email} ajouté.`);
  } catch (err) {
    console.error('Erreur add contact:', err);
    Alert.alert('Erreur', 'Impossible d’ajouter le contact.');
  }
};
