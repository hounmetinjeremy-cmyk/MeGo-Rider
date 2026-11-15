import React, { useEffect, useState } from 'react';
import { View, Text, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';

/**
 * Interrupteur "Ouvrir mon lien dans l'application" (is_marketplace_visible), affiché dans l'onglet Produits.
 * - Tous les produits publiés apparaissent TOUJOURS dans l'Accueil, quel que soit cet interrupteur.
 * - ACTIVÉ : un client qui ouvre le lien partagé (Facebook, WhatsApp) entre dans l'application, dans la boutique.
 * - DÉSACTIVÉ : le client reste sur la page web du vendeur et paie, sans être redirigé vers l'application.
 * Sans vendorId (ancien usage dans Profil) le composant n'affiche rien.
 */
export default function MarketplaceToggle({ vendorId, initialValue = false, onChange }) {
  const [visible, setVisible] = useState(!!initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId) return;
    let alive = true;
    supabase
      .from('vendors')
      .select('is_marketplace_visible')
      .eq('id', vendorId)
      .single()
      .then(({ data }) => {
        if (alive && data) setVisible(!!data.is_marketplace_visible);
      });
    return () => {
      alive = false;
    };
  }, [vendorId]);

  if (!vendorId) return null;

  async function toggle(next) {
    setLoading(true);
    setError(null);
    const previous = visible;
    setVisible(next);
    const { data, error: err } = await supabase.rpc('set_marketplace_visibility', {
      p_vendor_id: vendorId,
      p_visible: next,
    });
    setLoading(false);
    if (err || !data || data.ok === false) {
      setVisible(previous);
      setError((data && data.error) || (err && err.message) || 'Modification impossible');
      return;
    }
    setVisible(!!data.is_marketplace_visible);
    if (typeof onChange === 'function') onChange(!!data.is_marketplace_visible);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>Ouvrir mon lien dans l'application</Text>
          <Text style={styles.subtitle}>
            {visible
              ? "Activé : un client qui ouvre ton lien (Facebook, WhatsApp) entre directement dans l'application, dans ta boutique."
              : "Désactivé : un client qui ouvre ton lien reste sur la page web pour payer, sans aller dans l'application. Tes produits restent visibles dans l'Accueil."}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Switch value={visible} onValueChange={toggle} />
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, paddingRight: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 17 },
  error: { fontSize: 12, color: '#DC2626', marginTop: 8 },
});
